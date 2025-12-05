/* eslint-disable */
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    address: '',
    city: '',
    zipCode: '',
    email: '',
    phone: '',
    img: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Cargar datos del perfil
  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        const user = data.user;
        setFormData({
          name: user.name || '',
          lastName: user.lastName || '',
          address: user.address || '',
          city: user.city || '',
          zipCode: user.zipCode || '',
          email: user.email || '',
          phone: user.phone || '',
          img: user.img || '',
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error al obtener el perfil:', error);
        toast.error('Error al cargar los datos del perfil');
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setFormData((prevData) => ({
        ...prevData,
        img: URL.createObjectURL(file),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('zipCode', formData.zipCode);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      if (imageFile) formDataToSend.append('img', imageFile);

      const response = await fetch('/api/user', {
        method: 'PUT',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el perfil');
      }

      toast.success('Perfil actualizado con éxito');
      setTimeout(() => router.push('/profile'), 2000);
    } catch (err: unknown) {
      setLoading(false);
      const errorMessage =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Ocurrió un error inesperado.';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Cargando tu perfil...
      </div>
    );
  }

  // Clase reutilizable para inputs
  const inputClasses =
    "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 " +
    "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="py-8 bg-red-800 text-white text-center shadow-lg">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-wide">Editar Perfil</h1>
      </header>

      <section className="max-w-2xl mx-auto mt-8 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campos de texto */}
          {[
            { id: 'name', label: 'Nombre' },
            { id: 'lastName', label: 'Apellido' },
            { id: 'email', label: 'Correo Electrónico', type: 'email' },
            { id: 'phone', label: 'Teléfono' },
            { id: 'address', label: 'Dirección' },
            { id: 'city', label: 'Ciudad' },
            { id: 'zipCode', label: 'Código Postal' },
          ].map(({ id, label, type = 'text' }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
                {label}
              </label>
              <input
                type={type}
                id={id}
                name={id}
                value={formData[id as keyof typeof formData]}
                onChange={handleChange}
                required={id !== 'phone'}
                className={inputClasses}
              />
            </div>
          ))}

          {/* Imagen de perfil */}
          <div>
            <label htmlFor="img" className="block text-sm font-medium text-gray-300 mb-2">
              Imagen de Perfil
            </label>
            <div className="flex items-center space-x-4">
              {formData.img && (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-amber-600/40">
                  <img
                    src={formData.img}
                    alt="Vista previa"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <input
                type="file"
                id="img"
                name="img"
                accept="image/*"
                onChange={handleImageChange}
                className="text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-amber-700 file:text-white hover:file:bg-amber-800"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 px-4 font-semibold rounded-lg ${
                loading
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } transition`}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="flex-1 py-2.5 px-4 font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>

      <ToastContainer
        theme="colored"
        position="top-right"
        autoClose={3000}
      />
    </div>
  );
}