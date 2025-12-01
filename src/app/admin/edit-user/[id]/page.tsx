'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function EditUserPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params?.id;

  

  const [user, setUser] = useState<null | {
    name: string;
    lastName: string;
    address: string;
    city: string;
    zipCode: string;
    email: string;
    phone: string;
    role: string;
    img: string;
  }>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      try {
        const token = session?.user?.token || localStorage.getItem('token');
        if (typeof window !== 'undefined' && token) {
          localStorage.setItem('token', token);
        }

        if (!token) {
          setError('No se encontró el token.');
          router.push('/');
          return;
        }

        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        if (decodedToken.role !== 'admin') {
          router.push('/');
          return;
        }

        const response = await fetch(`/api/admin/users?id=${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Error al obtener el usuario');
        }

        const data = await response.json();
        setUser({
          name: data.name || '',
          lastName: data.lastName || '',
          address: data.address || '',
          city: data.city || '',
          zipCode: data.zipCode || '',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || '',
          img: data.img || '',
        });
      } catch (err: unknown) {
        let errorMessage = 'Ocurrió un error inesperado.';
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }

        setError(errorMessage);
        toast.error(errorMessage);
        setTimeout(() => {
          router.push('/admin');
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, session, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (user) {
      setUser(prev => ({
        ...prev!,
        [name]: value,
      }));
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No se encontró el token.');
        return;
      }

      const formData = new FormData();
      formData.append('name', user!.name);
      formData.append('lastName', user!.lastName);
      formData.append('address', user!.address);
      formData.append('city', user!.city);
      formData.append('zipCode', user!.zipCode);
      formData.append('phone', user!.phone);
      formData.append('role', user!.role);

      const imgFile = (e.currentTarget.querySelector('#img') as HTMLInputElement)?.files?.[0];
      if (imgFile) {
        formData.append('img', imgFile);
      }

      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el usuario');
      }

      toast.success('Usuario actualizado con éxito');
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (err: unknown) {
      let errorMessage = 'Ocurrió un error inesperado.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Cargando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-400">
        {error}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Usuario no encontrado.
      </div>
    );
  }

  if(!session || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    router.push('/');
    return null;
  }
  


  // Clase reutilizable para inputs
  const inputClasses =
    "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 " +
    "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="py-8 bg-red-800 text-white text-center shadow-lg">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-wide">Editar Usuario</h1>
      </header>

      <section className="max-w-2xl mx-auto mt-8 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <form onSubmit={handleUpdateUser} className="space-y-5">

          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              Nombre
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={user.name}
              onChange={handleChange}
              required
              className={inputClasses}
            />
          </div>

          {/* Apellido */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">
              Apellido
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={user.lastName}
              onChange={handleChange}
              required
              className={inputClasses}
            />
          </div>

          {/* Email (deshabilitado) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={user.email}
              disabled
              className={`${inputClasses} bg-gray-700 text-gray-400 cursor-not-allowed`}
            />
          </div>

          {/* Dirección */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-1">
              Dirección
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={user.address}
              onChange={handleChange}
              required
              className={inputClasses}
            />
          </div>

          {/* Ciudad */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-1">
              Ciudad
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={user.city}
              onChange={handleChange}
              required
              className={inputClasses}
            />
          </div>

          {/* Código Postal */}
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-300 mb-1">
              Código Postal
            </label>
            <input
              type="text"
              id="zipCode"
              name="zipCode"
              value={user.zipCode}
              onChange={handleChange}
              required
              className={inputClasses}
            />
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
              Teléfono
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={user.phone}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          {/* Imagen */}
          <div>
            <label htmlFor="img" className="block text-sm font-medium text-gray-300 mb-1">
              Imagen de Perfil
            </label>
            <input
              type="file"
              id="img"
              name="img"
              accept="image/*"
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-amber-700 file:text-white hover:file:bg-amber-800"
            />
          </div>

          {/* Rol */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">
              Rol
            </label>
            <select
              id="role"
              name="role"
              value={user.role}
              onChange={handleChange}
              required
              className={inputClasses}
            >
              <option value="superadmin">Super Administrador</option>
              <option value="admin">Administrador</option>
              <option value="vendedor">Vendedor</option>
              <option value="user">Usuario</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition shadow-md"
            >
              Guardar Cambios
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin')}
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