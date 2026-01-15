'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface User {
  _id: string;
  name: string;
  lastName: string;
  address: string;
  city: string;
  zipCode: string;
  email: string;
  phone: string;
  role: 'admin' | 'user' | string;
  img?: string;
  token?: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<User[]>([]);
  const router = useRouter();

  // 🔒 Estado de autorización completa
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const validateAndFetch = async () => {
      // 1. Esperar a que next-auth termine de cargar
      if (status === 'loading') return;

      // 2. Si no está autenticado → redirigir inmediatamente
      if (status === 'unauthenticated') {
        router.push('/');
        return;
      }

      // 3. Si está autenticado, verificar token y rol
      const token = session?.user?.token || localStorage.getItem('token');
      if (!token) {
        toast.error('Acceso denegado');
        router.push('/');
        return;
      }

      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        if (decodedToken.role !== 'admin' && decodedToken.role !== 'superadmin') {
          toast.error('Acceso restringido a administradores');
          router.push('/');
          return;
        }

        // 4. Si todo OK → cargar datos y autorizar render
        await fetchUsers(token);
        setIsAuthorized(true);
      } catch (err) {
        console.error('Error al validar sesión:', err);
        toast.error('Sesión inválida');
        router.push('/');
      }
    };

    validateAndFetch();
  }, [session, status, router]);

  const fetchUsers = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);
      } else {
        throw new Error('Error al cargar los usuarios intente salir y volver a entrar ');
      }
    } catch (error) {
      console.error('Error al cargar los usuarios:', error);
      toast.error('Hubo un error al cargar los usuarios intente salir y volver a entrar ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const token = session?.user?.token || localStorage.getItem('token');

    if (!token) {
      toast.error('Sesión expirada');
      router.push('/login');
      return;
    }

    if (userId === session?.user?.id) {
      toast.error('No puedes eliminar tu propia cuenta.');
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esto eliminará el usuario de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#1f2937',
      color: '#f3f4f6',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });

    if (!confirm.isConfirmed) return;

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el usuario');
      }

      toast.success('Usuario eliminado con éxito');
      setUsers(users.filter(user => user._id !== userId));
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);
      toast.error('Hubo un error al eliminar el usuario');
    }
  };

  // 🔒 NUNCA renderices contenido sensible hasta que isAuthorized sea true
 // if (!isAuthorized) {
    // Opcional: puedes mostrar un loader sutil aquí, pero no contenido
  //  return null; // ← Esto evita el "flash" de contenido no autorizado
 // }

  if (!isAuthorized) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-gray-400 text-lg">Verificando permisos...</p>
     
      {
        isLoading && (
          <div className="ml-4 loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-6 w-6"></div>
        ) 
      }    
    </div>
  );
}

  const cardClasses = "border border-gray-700 rounded-lg shadow-md p-4 bg-gray-800";
  const tableHeaderClasses = "p-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-800";
  const tableCellClasses = "p-4 text-xs text-gray-300 border-t border-gray-700";

 return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-white text-center md:text-left">Administrar Usuarios</h1>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-400 text-lg">Cargando usuarios...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-400 text-lg">No hay usuarios registrados.</p>
        </div>
      ) : null}

      {/* Tarjetas móviles */}
      <div className="md:hidden space-y-4">
        {users.map(user => (
          <div key={user._id} className={cardClasses}>
            <div className="flex items-start space-x-4">
              {user.img ? (
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <Image
                    src={user.img}
                    alt={`Avatar de ${user.name}`}
                    fill
                    sizes="3rem"
                    style={{ objectFit: 'cover' }}
                    className="bg-gray-700"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 text-sm">—</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{user.name} {user.lastName}</p>
                <p className="text-sm text-amber-400 truncate">{user.email}</p>
                <p className="text-xs text-gray-400 mt-1"><strong>Rol:</strong> {user.role}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Link
                href={`/admin/edit-user/${user._id}`}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded text-sm text-center transition"
              >
                Editar
              </Link>
              <button
                onClick={() => handleDeleteUser(user._id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla escritorio */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full bg-gray-800">
          <thead>
            <tr>
              <th className={tableHeaderClasses}>Foto</th>
              <th className={tableHeaderClasses}>Nombre</th>
              <th className={tableHeaderClasses}>Apellido</th>
              <th className={tableHeaderClasses}>Dirección</th>
              <th className={tableHeaderClasses}>Ciudad</th>
              <th className={tableHeaderClasses}>Cód. Postal</th>
              <th className={tableHeaderClasses}>Teléfono</th>
              <th className={tableHeaderClasses}>Correo</th>
              <th className={tableHeaderClasses}>Rol</th>
              <th className={tableHeaderClasses}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id} className="hover:bg-gray-750 transition">
                <td className={tableCellClasses}>
                  {user.img ? (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden">
                      <Image
                        src={user.img}
                        alt={`Avatar de ${user.name}`}
                        fill
                        sizes="2rem"
                        style={{ objectFit: 'cover' }}
                        className="bg-gray-700"
                      />
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs">—</span>
                  )}
                </td>
                <td className={tableCellClasses}>{user.name}</td>
                <td className={tableCellClasses}>{user.lastName}</td>
                <td className={tableCellClasses}>{user.address}</td>
                <td className={tableCellClasses}>{user.city}</td>
                <td className={tableCellClasses}>{user.zipCode}</td>
                <td className={tableCellClasses}>{user.phone}</td>
                <td className={`${tableCellClasses} break-all max-w-[150px]`}>{user.email}</td>
                <td className={tableCellClasses}>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.role === 'admin' 
                      ? 'bg-red-900/50 text-amber-400' 
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className={tableCellClasses}>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/edit-user/${user._id}`}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-xs transition"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDeleteUser(user._id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}