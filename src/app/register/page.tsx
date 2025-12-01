'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { RingLoader } from 'react-spinners';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isValidForm = () => email && password.length >= 6 && /\S+@\S+\.\S+/.test(email);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidForm()) {
      setError('Por favor, ingresa un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    const response = await fetch('/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    setLoading(false);

    if (response.ok) {
      toast.success('¡Registro exitoso! Redirigiendo...', { theme: 'colored' });
      router.push('/login');
    } else {
      toast.error(data.message || 'Error al registrar usuario', { theme: 'colored' });
      setError(data.message || 'Error al registrar el usuario.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Registrarse
          </h2>

          {error && (
            <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-gray-800 dark:text-gray-200 font-medium mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-800 dark:text-gray-200 font-medium mb-2">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                required
              />
              {password.length > 0 && password.length < 6 && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                  La contraseña debe tener al menos 6 caracteres.
                </p>
              )}
            </div>

            <div className="flex justify-center pt-2">
              {loading ? (
                <div className="flex justify-center py-3">
                  <RingLoader size={50} color="#F59E0B" />
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !isValidForm()}
                  className={`w-full py-3 px-4 font-semibold rounded-lg transition-all duration-300 ${
                    isValidForm()
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Registrarse
                </button>
              )}
            </div>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <a
                href="/login"
                className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
              >
                Inicia sesión
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}