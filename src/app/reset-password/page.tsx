'use client';
import { useState } from 'react';
import { RingLoader } from 'react-spinners';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Enviando correo de recuperación...');

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus('Correo enviado correctamente. Revisa tu bandeja de entrada.');
      } else {
        setStatus('Error al enviar el correo. Inténtalo de nuevo.');
      }
    } catch {
      // Eliminamos la variable `error` ya que no se usa
      setStatus('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-50 text-amber-900 font-sans flex items-center justify-center">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Recuperar Contraseña</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-brown-700 font-semibold mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full p-3 rounded-lg border border-yellow-300 focus:outline-none focus:border-yellow-500 transition duration-300"
              required
            />
          </div>
          <div className="flex justify-center">
            {loading ? (
              <RingLoader size={50} color="#F59E0B" loading={loading} />
            ) : (
              <button
                type="submit"
                className="w-full bg-yellow-500 text-brown-900 font-semibold py-3 rounded-full hover:bg-yellow-600 transition duration-300"
              >
                Enviar Correo de Recuperación
              </button>
            )}
          </div>
          {status && <p className="text-center mt-4">{status}</p>}
        </form>
      </div>
    </div>
  );
}