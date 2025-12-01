/* eslint-disable */
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Swal from 'sweetalert2';

interface UserData {
  name: string;
  lastName: string;
  address?: string;
  city?: string;
  zipCode?: string;
  email: string;
  phone?: string;
  img?: string;
}

export default function ProfilePage() {
  const {data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetch('/api/profile')
        .then((res) => res.json())
        .then((data: { user: UserData }) => {
          setUserData(data.user);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error al obtener el perfil:', error);
          setLoading(false);
        });
    }
  }, [status, router]);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Cerrarás tu sesión actual.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
      background: '#111827', // bg-gray-900
      color: '#f3f4f6',      // text-gray-100
      confirmButtonColor: '#dc2626', // red-600
      cancelButtonColor: '#4b5563',  // gray-600
    });

    if (result.isConfirmed) {
      signOut({ callbackUrl: '/' });
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Cargando tu perfil...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="py-8 bg-red-800 text-white text-center shadow-lg">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-wide">Mi Perfil</h1>
      </header>

      <section className="max-w-2xl mx-auto mt-8 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <div className="flex flex-col items-center space-y-6">
          {/* Avatar */}
          {userData?.img ? (
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-amber-600/30">
              <Image
                src={userData.img}
                alt="Foto de perfil"
                fill
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <div className="w-28 h-28 bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-600">
              <span className="text-5xl text-gray-400">👤</span>
            </div>
          )}

          {/* Nombre */}
          <h2 className="text-2xl font-bold text-center max-w-xs">
            {userData?.name || 'Nombre'} {userData?.lastName || ''}
          </h2>

          {/* Datos */}
          <div className="w-full space-y-3 text-sm">
            <p className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Correo:</span>
              <span className="font-medium">{userData?.email || '—'}</span>
            </p>
            <p className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Teléfono:</span>
              <span className="font-medium">{userData?.phone || '—'}</span>
            </p>
            <p className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Dirección:</span>
              <span className="font-medium">{userData?.address || '—'}</span>
            </p>
            <p className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Ciudad:</span>
              <span className="font-medium">{userData?.city || '—'}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-400">Cód. Postal:</span>
              <span className="font-medium">{userData?.zipCode || '—'}</span>
            </p>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 w-full mt-6">
            <Link
              href="/profile/edit"
              className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition text-center"
            >
              Editar Perfil
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}