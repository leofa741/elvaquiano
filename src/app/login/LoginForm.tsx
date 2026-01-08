'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { signIn, useSession } from 'next-auth/react';
import { RingLoader } from 'react-spinners';
import Image from 'next/image';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { AuthContext } from '../context/AuthContext';
import Link from 'next/link';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaSolution, setCaptchaSolution] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/gestion';

  const { data: session, status } = useSession();
  const { setUserRole } = useContext(AuthContext);

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 10);
    const n2 = Math.floor(Math.random() * 10);
    setCaptchaQuestion(`${n1} + ${n2} = ?`);
    setCaptchaSolution(n1 + n2);
  };

  const isValidForm = () =>
    email.trim() !== '' &&
    password.length >= 6 &&
    /\S+@\S+\.\S+/.test(email) &&
    Number(captchaAnswer) === captchaSolution;

  useEffect(() => {
    generateCaptcha();
  }, []);

  // ⬅️ SE EJECUTA SOLO cuando NextAuth confirma que la sesión es válida
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setUserRole(session.user.role);
      router.push(callbackUrl);
    }
  }, [status, session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidForm()) {
      setError('Completa todos los datos correctamente.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (res?.error) {
      toast.error('Correo o contraseña incorrectos');
      setError('Correo o contraseña incorrectos');
    }
  };

  const handleGoogleLogin = async () => {
    await signIn('google', { callbackUrl });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RingLoader size={50} color="#F59E0B" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center  dark:bg-gray-900 p-4">
      <div className="bg-gray-200 dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">

        <div className="flex justify-center mb-6">
          <Image src="/img/El-Vaquiano.png" alt="Logo" width={120} height={180} />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-yellow-400 mb-6">
          Iniciar sesión
        </h2>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-yellow-100 font-semibold py-3 rounded-sm flex items-center justify-center gap-2"
        >
          <ArrowPathIcon className="h-6 w-6 text-red-500" />
          Iniciar sesión con Google
        </button>

        <div className="flex items-center my-4">
          <hr className="flex-grow border-gray-300 dark:border-gray-600" />
          <span className="mx-4 text-gray-600 dark:text-gray-400">O</span>
          <hr className="flex-grow border-gray-300 dark:border-gray-600" />
        </div>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 dark:text-yellow-200 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:text-yellow-100"
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-yellow-200 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:text-yellow-100"
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-yellow-200 mb-1">Verificación humana</label>
            <div className="flex items-center gap-2">
              <span className="font-bold text-yellow-700 dark:text-yellow-300">{captchaQuestion}</span>
              <input
                type="text"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className="w-32 p-2 rounded-lg border dark:bg-gray-700 dark:text-yellow-100"
              />
            </div>
          </div>

          <button
            disabled={loading || !isValidForm()}
            className="w-full bg-yellow-500 text-black py-3 rounded-sm font-semibold"
          >
            {loading ? <RingLoader size={30} color="#000" /> : 'Iniciar sesión'}
          </button>

          <Link
            href="/register"
            className="text-sm text-yellow-400 hover:underline block text-center"
          >
            ¿No tienes una cuenta? Regístrate <br/>
            o simplemente ingresa con tu cuenta de Gmail.
          </Link>

          <Link
            href="/forgot-password"
            className="text-sm text-yellow-400 hover:underline block text-center"
          >
            ¿Olvidaste tu contraseña?
          </Link>



        </form>
      
      </div>

     

    </div>
  );
}
