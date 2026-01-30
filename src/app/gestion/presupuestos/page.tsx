'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import { FaFileInvoice, FaPlus, FaEye } from 'react-icons/fa';
import Swal from 'sweetalert2';

interface Presupuesto {
  _id: string;
  cliente: { razonSocial: string };
  total: number;
  estado: string;
  createdAt: string;
  pedidoAsociado?: string;
  origen?: string;
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

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* ===============================
     FETCH CENTRALIZADO
  =============================== */
  const fetchPresupuestos = useCallback(async () => {
    if (auth !== true) return;

    try {
      setLoading(true);

      const res = await fetch(
        `/api/gestion/presupuestos?page=${page}&limit=10`,
        { cache: 'no-store' }
      );

      if (!res.ok) throw new Error('Error al cargar presupuestos');

      const { data, totalPages } = await res.json();

      setPresupuestos(data);
      setTotalPages(totalPages);
    } catch (err: any) {
      console.error(err);
      Swal.fire(
        'Error',
        err.message || 'No se pudieron cargar los presupuestos',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [auth, page]);

  /* ===============================
     SOLO REFRESCA SI EL ADMIN MIRA
  =============================== */
  useEffect(() => {
    if (auth !== true) return;

    let interval: NodeJS.Timeout | null = null;

    const start = () => {
      fetchPresupuestos(); // 🔥 inmediato al entrar o volver
      interval = setInterval(fetchPresupuestos, 120_000); // ⏱ 2 minutos
    };

    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    // Primera carga
    start();

    // Eventos de foco
    window.addEventListener('focus', start);
    window.addEventListener('blur', stop);

    return () => {
      stop();
      window.removeEventListener('focus', start);
      window.removeEventListener('blur', stop);
    };
  }, [auth, fetchPresupuestos]);

  /* ===============================
     ESTADOS DE AUTORIZACIÓN
  =============================== */
  if (auth === null) {
    return (
      <div className="p-6 text-center text-gray-400 min-h-screen flex items-center justify-center">
        Verificando acceso...
      </div>
    );
  }

  if (auth === false) return null;

  /* ===============================
     RENDER
  =============================== */
  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FaFileInvoice className="text-amber-400" />
            Gestión de Presupuestos
          </h1>
          <p className="text-gray-400 mt-1">
            Crear, imprimir y convertir cotizaciones en pedidos.
          </p>
          <p className="text-gray-400 mt-1">
            Volver a{' '}
            <Link href="/gestion" className="text-amber-400 underline">
              Gestión
            </Link>
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

      {/* Listado */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-300">
            Cargando presupuestos...
          </div>
        ) : presupuestos.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No hay presupuestos registrados.
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
                    {/* Origen (default seguro) */}
                    {(p.origen ?? 'mostrador') === 'online' && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                        Online
                      </span>
                    )}

                    {/* Estado */}
                    <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                      {ESTADO_LABEL[p.estado] || p.estado}
                    </span>

                    {/* Ver */}
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 p-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
          >
            ← Anterior
          </button>

          <span className="px-3 py-1 text-gray-300">
            Página {page} de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
