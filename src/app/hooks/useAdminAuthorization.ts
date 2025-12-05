// app/hooks/useAdminAuthorization.ts
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

/**
 * Hook para proteger páginas solo accesibles por admin/superadmin.
 * Redirige automáticamente si no tiene permisos.
 * Retorna `true` cuando está autorizado.
 */
export function useAdminAuthorization(): boolean {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const validateAccess = async () => {
      if (status === 'loading') return;
      if (status === 'unauthenticated') {
        router.push('/');
        return;
      }

      // Intentar obtener el token (de NextAuth o localStorage)
      const token = session?.user?.token || localStorage.getItem('token');
      if (!token) {
        toast.error('Acceso denegado');
        router.push('/');
        return;
      }

      try {
        // Decodificar el payload del JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!['admin', 'superadmin'].includes(payload.role)) {
          toast.error('Acceso restringido a administradores');
          router.push('/');
          return;
        }
        setIsAuthorized(true);
      } catch (err) {
        console.error('Error al validar token:', err);
        toast.error('Sesión inválida');
        router.push('/');
      }
    };

    validateAccess();
  }, [status, router, session]);

  return isAuthorized;
}