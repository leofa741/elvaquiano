'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import { FaFileInvoice, FaPlus, FaEye } from 'react-icons/fa';
import Swal from 'sweetalert2';

interface Presupuesto {
  _id: string;
  cliente: { razonSocial: string };
  total: number;
  estado: string;
  createdAt: string;
  pedidoAsociado?: string;
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  convertido: 'Convertido',
};

export default function PresupuestosPage() {
  const auth = useAdminAuthorization();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);

  // Cargar datos solo cuando autorizado
  useEffect(() => {
    if (auth !== true) return;

    setLoading(true);
    const fetchPresupuestos = async () => {
      try {
        const res = await fetch('/api/gestion/presupuestos', {
          cache: 'no-store',
        });

        if (!res.ok) throw new Error('Error al cargar');

        const data = await res.json();
        setPresupuestos(data);
      } catch (err: any) {
        Swal.fire(
          'Error',
          err.message || 'No se pudieron cargar los presupuestos',
          'error'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPresupuestos();
  }, [auth]);

  // Mientras valida la sesión
  if (auth === null) {
    return (
      <div className="p-6 text-center text-gray-400 min-h-screen flex items-center justify-center">
        Verificando acceso...
      </div>
    );
  }

  // Si no autorizado, no renderizar (aunque ya redirige)
  if (auth === false) {
    return null;
  }

  // ✅ Solo llega aquí si auth === true
  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FaFileInvoice className="text-amber-400" />
            Gestión de Presupuestos
          </h1>
          <p className="text-gray-400 mt-1">
            Crear, imprimir y convertir cotizaciones en pedidos.
          </p>
        </div>

        <Link
          href="/gestion/presupuestos/nuevo"
          className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center gap-2"
        >
          <FaPlus />
          Nuevo Presupuesto
        </Link>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-300">
            Cargando presupuestos...
          </div>
        ) : presupuestos.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No hay presupuestos registrados.{' '}
            <Link
              href="/gestion/presupuestos/nuevo"
              className="text-amber-400 hover:underline"
            >
              Crear uno nuevo
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {presupuestos.map((p) => (
              <div key={p._id} className="p-4 hover:bg-gray-750 transition">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-medium text-white">
                      {p.cliente.razonSocial}
                    </div>
                    <div className="text-sm text-gray-400">
                      ${p.total.toFixed(2)} •{' '}
                      {new Date(p.createdAt).toLocaleDateString('es-AR')}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                      {ESTADO_LABEL[p.estado] || p.estado}
                    </span>

                    <Link
                      href={`/gestion/presupuestos/imprimir/${p._id}`}
                      className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1"
                    >
                      <FaEye />
                      Ver
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}