// app/contact/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaWhatsapp, FaStore, FaTruck } from 'react-icons/fa';

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    asunto: '',
    message: '',
    businessType: '',
  });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    setLoading(true);

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus('Por favor, completa todos los campos obligatorios.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setStatus('¡Consulta enviada! Nuestro equipo te contactará pronto.');
        setForm({ name: '', email: '', phone: '', asunto: '', message: '', businessType: '' });
      } else {
        setStatus(data.message || 'Hubo un error. Inténtalo nuevamente.');
      }
    } catch (error) {
      setStatus('Error de conexión. Verifica tu red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-16 px-4">
      <div className="max-w-6xl mx-auto text-center mb-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          ¿Querés abastecer tu negocio con El Vaquiano?
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Somos distribuidores mayoristas de productos alimenticios de primera calidad.
          Contactanos para acceder a precios exclusivos, listas de precios y atención personalizada.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info lateral */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-red-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaStore className="text-amber-400" /> ¿Para qué tipo de negocio?
            </h2>
            <ul className="space-y-2 text-sm text-gray-200">
              <li>🏪 Kioscos y minimercados</li>
              <li>🍽️ Restaurantes y bares</li>
              <li>🥗 Dietéticas y tiendas naturistas</li>
              <li>🏪 Almacenes y supermercados</li>
            </ul>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="font-semibold text-lg mb-3">¿Prefieres WhatsApp?</h3>
            <a
              href="https://wa.me/5492224492051?text=Hola,%20quiero%20información%20para%20mi%20negocio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition"
            >
              <FaWhatsapp className="text-xl" />
              <span>Escribinos por WhatsApp</span>
            </a>
            <div className="mt-4 flex items-center gap-3 text-gray-300 text-sm">
              <FaTruck className="text-amber-500" />
              <span>Entregas en toda la región</span>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1 text-gray-300">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-300">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-1 text-gray-300">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+54 11 5555-5555"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="businessType" className="block text-sm font-medium mb-1 text-gray-300">
                  Tipo de negocio
                </label>
                <select
                  id="businessType"
                  value={form.businessType}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Seleccioná tu rubro</option>
                  <option value="kiosco">Kiosco / Minimercado</option>
                  <option value="restaurante">Restaurante / Bar</option>
                  <option value="dietetica">Dietetica / Tienda naturalista</option>
                  <option value="almacen">Almacén / Supermercado</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1 text-gray-300">
                  Mensaje *
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Ej: Necesito lista de precios mayorista, stock de lácteos, etc."
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  'Enviar Consulta Comercial'
                )}
              </button>

              {status && (
                <p
                  className={`mt-3 text-center text-sm font-medium ${
                    status.includes('éxito') || status.includes('Éxito') || status.includes('enviada')
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {status}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}