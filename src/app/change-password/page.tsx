// app/change-password/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');

    if (password !== confirmPassword) {
      setStatus('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('Token inválido.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
        
      });

      const data = await res.json();
      if (data.success) {
        setStatus('Contraseña actualizada correctamente.');
        setTimeout(() => router.push('/login'), 2000); // Redirige al login
      } else {
        setStatus(data.message || 'Error al actualizar la contraseña.');
      }
    } catch (error) {
      console.error('Error al cambiar la contraseña:', error); // Registra el error en la consola
      setStatus('Error de conexión. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-50 text-amber-900 font-sans flex items-center justify-center">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Cambiar Contraseña</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-brown-700 font-semibold mb-2">
              Nueva Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="w-full p-3 rounded-lg border border-yellow-300 focus:outline-none focus:border-yellow-500 transition duration-300"
              required
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-brown-700 font-semibold mb-2">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar contraseña"
              className="w-full p-3 rounded-lg border border-yellow-300 focus:outline-none focus:border-yellow-500 transition duration-300"
              required
            />
          </div>
          <div className="flex justify-center">
            {loading ? (
              <div>Cargando...</div>
            ) : (
              <button
                type="submit"
                className="w-full bg-yellow-500 text-brown-900 font-semibold py-3 rounded-full hover:bg-yellow-600 transition duration-300"
              >
                Cambiar Contraseña
              </button>
            )}
          </div>
          {status && <p className="text-center mt-4">{status}</p>}
        </form>
      </div>
    </div>
  );
}