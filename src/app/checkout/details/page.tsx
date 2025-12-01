
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function CheckoutDetails() {
  const { data: session } = useSession();
  const router = useRouter();

  console.log('Session:', session);

  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (!session) {
      toast.error('Debes iniciar sesión para continuar.', {
        position: 'top-right',
        autoClose: 3000,
      });
      router.push('/login');
    } else {
      // Cargar los datos del usuario cuando esté disponible la sesión
      setFormData({
        name: session.user?.name || '',
        lastName: session.user?.lastName || '',
        address: session.user?.address || '',
        city: session.user?.city || '',
        zipCode: session.user?.zipCode || '',
        phone: session.user?.phone || '',
        email: session.user?.email || '',
      });
    }
  }, [session, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validación básica
    if (!formData.name || !formData.lastName || !formData.address || !formData.city || !formData.zipCode || !formData.phone || !formData.email) {
      toast.error('Por favor, completa todos los campos.', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }

    try {
      const response = await fetch('/api/save-user-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.user?.token}`, 
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Datos guardados correctamente.', {
          position: 'top-right',
          autoClose: 3000,
        });
        router.push('/checkout/confirmation');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al guardar los datos.', {
          position: 'top-right',
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Error al enviar los datos:', error);
      toast.error('Error al comunicarse con el servidor.', {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  // Función para formatear números como moneda local (ej: 39000 → "39.000,00")


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Detalles de Envío</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl space-y-6">
  <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Datos de contacto</h2>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Nombre */}
    <div className="flex flex-col">
      <label htmlFor="name" className="text-gray-700 font-semibold mb-2">Nombre</label>
      <input
        type="text"
        id="name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Tu nombre"
        required
      />
    </div>

    {/* Apellido */}
    <div className="flex flex-col">
      <label htmlFor="lastName" className="text-gray-700 font-semibold mb-2">Apellido</label>
      <input
        type="text"
        id="lastName"
        name="lastName"
        value={formData.lastName}
        onChange={handleChange}
        className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Tu apellido"
        required
      />
    </div>

    {/* Dirección */}
    <div className="flex flex-col md:col-span-2">
      <label htmlFor="address" className="text-gray-700 font-semibold mb-2">Dirección</label>
      <input
        type="text"
        id="address"
        name="address"
        value={formData.address}
        onChange={handleChange}
        className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Calle, número, piso"
        required
      />
    </div>

    {/* Ciudad */}
    <div className="flex flex-col">
      <label htmlFor="city" className="text-gray-700 font-semibold mb-2">Ciudad</label>
      <input
        type="text"
        id="city"
        name="city"
        value={formData.city}
        onChange={handleChange}
        className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Tu ciudad"
        required
      />
    </div>

    {/* Código Postal */}
    <div className="flex flex-col">
      <label htmlFor="zipCode" className="text-gray-700 font-semibold mb-2">Código Postal</label>
      <input
        type="text"
        id="zipCode"
        name="zipCode"
        value={formData.zipCode}
        onChange={handleChange}
        className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="CP"
        required
      />
    </div>

    {/* Teléfono */}
    <div className="flex flex-col">
      <label htmlFor="phone" className="text-gray-700 font-semibold mb-2">Teléfono</label>
      <input
        type="tel"
        id="phone"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Número de contacto"
        required
      />
    </div>

    {/* Email */}
    <div className="flex flex-col">
      <label htmlFor="email" className="text-gray-700 font-semibold mb-2">Email</label>
      <input
        type="email"
        id="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="correo@ejemplo.com"
        required
      />
    </div>
  </div>

  {/* Botón de envío */}
  <div className="text-center pt-6">
    <button
      type="submit"
      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold px-8 py-3 rounded-full hover:from-blue-600 hover:to-indigo-700 transition duration-300"
    >
      Guardar y Continuar
    </button>
  </div>
</form>

      
      <ToastContainer />
    </div>
  );
}
