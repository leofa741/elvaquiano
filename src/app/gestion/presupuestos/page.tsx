'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import { FaFileInvoice, FaPlus, FaEye, FaChevronLeft, FaChevronRight, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { formatARS } from '@/app/lib/formatcurrenci';

interface Presupuesto {
  _id: string;
  cliente: { razonSocial: string; telefono: string };
  total: number;
  estado: string;
  createdAt: string;
  origen?: string;
  vistoPorAdmin: boolean;
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  convertido: 'Convertido',
};

const ITEMS_POR_PAGINA = 10;

export default function PresupuestosPage() {
  const auth = useAdminAuthorization();

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevNuevosRef = useRef<number>(0);

  /* ===============================
     INIT AUDIO
  =============================== */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    audioRef.current = new Audio('/sounds/new-notification-08-352461.mp3');
    audioRef.current.volume = 0.8;

    const unlock = () => {
      audioRef.current
        ?.play()
        .then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        })
        .catch(() => {});
      window.removeEventListener('click', unlock);
    };

    window.addEventListener('click', unlock);
    return () => window.removeEventListener('click', unlock);
  }, []);

  /* ===============================
     FETCH
  =============================== */
  const fetchPresupuestos = useCallback(async () => {
    if (auth !== true) return;

    try {
      setLoading(true);

      const res = await fetch(
        `/api/gestion/presupuestos?page=${page}&limit=${ITEMS_POR_PAGINA}`,
        { cache: 'no-store' }
      );

      if (!res.ok) throw new Error('Error al cargar presupuestos');

      const { data, totalPages, total } = await res.json();

      setPresupuestos(data);
      setTotalPages(totalPages);
      setTotalItems(total);

      const nuevosActuales = data.filter(
        (p: Presupuesto) => !p.vistoPorAdmin
      ).length;

      if (
        prevNuevosRef.current !== 0 &&
        nuevosActuales > prevNuevosRef.current
      ) {
        audioRef.current?.play().catch(() => {});
      }

      prevNuevosRef.current = nuevosActuales;
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudieron cargar', 'error');
    } finally {
      setLoading(false);
    }
  }, [auth, page]);

  /* ===============================
     REFRESH CON FOCO
  =============================== */
  useEffect(() => {
    if (auth !== true) return;

    let interval: NodeJS.Timeout | null = null;

    const start = () => {
      fetchPresupuestos();
      interval = setInterval(fetchPresupuestos, 120_000);
    };

    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    start();
    window.addEventListener('focus', start);
    window.addEventListener('blur', stop);

    return () => {
      stop();
      window.removeEventListener('focus', start);
      window.removeEventListener('blur', stop);
    };
  }, [auth, fetchPresupuestos]);

  /* ===============================
     MARCAR COMO VISTO
  =============================== */
  const marcarComoVisto = async (id: string) => {
    try {
      await fetch(`/api/gestion/presupuestos/${id}/visto`, {
        method: 'PATCH',
      });

      setPresupuestos(prev =>
        prev.map(p =>
          p._id === id ? { ...p, vistoPorAdmin: true } : p
        )
      );
    } catch {}
  };

  /* ===============================
     🗑️ ELIMINAR PRESUPUESTO
  =============================== */
  const eliminarPresupuesto = async (id: string, cliente: string) => {
    // 🔥 Confirmación con SweetAlert
    const result = await Swal.fire({
      title: '¿Eliminar presupuesto?',
      text: `¿Estás seguro de eliminar el presupuesto de "${cliente}"? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/gestion/presupuestos/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('No se pudo eliminar');

      // ✅ Feedback visual
      Swal.fire({
        title: 'Eliminado',
        text: 'El presupuesto fue eliminado correctamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });

      // 🔄 Actualizar estado local
      setPresupuestos(prev => {
        const nuevos = prev.filter(p => p._id !== id);
        
        // Si la página queda vacía y no es la primera, ir a la anterior
        if (nuevos.length === 0 && page > 1) {
          setPage(p => p - 1);
        }
        
        return nuevos;
      });

      // 🔄 Recalcular totales (opcional: podés volver a fetchear)
      setTotalItems(prev => Math.max(0, prev - 1));
      
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudo eliminar el presupuesto', 'error');
    }
  };

  /* ===============================
     PAGINACIÓN
  =============================== */
  const irAPagina = (nuevaPagina: number) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPages) return;
    setPage(nuevaPagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ===============================
     AUTH STATES
  =============================== */
  if (auth === null)
    return (
      <div className="p-6 text-center text-gray-400 min-h-screen flex items-center justify-center">
        Verificando acceso...
      </div>
    );

  if (auth === false) return null;

  const nuevos = presupuestos.filter(p => !p.vistoPorAdmin);
  const inicio = totalItems > 0 ? (page - 1) * ITEMS_POR_PAGINA + 1 : 0;
  const fin = totalItems > 0 ? Math.min(page * ITEMS_POR_PAGINA, totalItems) : 0;

  /* ===============================
     RENDER
  =============================== */
  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <AnimatePresence>
            {nuevos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-2 inline-flex bg-amber-500 text-black px-3 py-1 rounded-full text-sm font-semibold"
              >
                🆕 {nuevos.length} nuevo{nuevos.length > 1 ? 's' : ''}
              </motion.div>
            )}
          </AnimatePresence>

          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <FaFileInvoice className="text-amber-400" />
            Gestión de Presupuestos
          </h1>
        </div>

        <Link
          href="/gestion/presupuestos/nuevo"
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus /> Nuevo
        </Link>
      </div>

      {/* LISTADO */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-300">Cargando presupuestos...</div>
        ) : presupuestos.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No hay presupuestos registrados aún.</div>
        ) : (
          <>
            <div className="divide-y divide-gray-700">
              {presupuestos.map(p => {
                const esNuevo = !p.vistoPorAdmin;

                return (
                  <motion.div
                    key={p._id}
                    initial={esNuevo ? { opacity: 0, scale: 0.97 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 ${
                      esNuevo
                        ? 'bg-amber-900/20 border-l-4 border-amber-400'
                        : 'hover:bg-gray-750'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-medium">
                          {p.cliente.razonSocial}
                        </div>
                        <span className="text-sm text-gray-400">
                          presupuesto # : {p._id}
                        </span>{' '}
                        <br />
                        <span className="text-sm text-gray-400">
                          telefono : {p.cliente.telefono}{' '}
                        </span>
                        <div className="text-sm text-gray-400">
                          {formatARS(p.total)} •{' '}
                          {new Date(p.createdAt).toLocaleDateString('es-AR')}
                        </div>
                      </div>

                      <div className="flex gap-3 items-center">
                        {esNuevo && (
                          <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded font-semibold">
                            🆕 Nuevo
                          </span>
                        )}

                        {(p.origen ?? 'mostrador') === 'online' && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                            Online
                          </span>
                        )}

                        <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                          {ESTADO_LABEL[p.estado] || p.estado}
                        </span>

                        {/* 👁️ Ver */}
                        <Link
                          href={`/gestion/presupuestos/imprimir/${p._id}`}
                          onClick={() => marcarComoVisto(p._id)}
                          className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1"
                          title="Ver presupuesto"
                        >
                          <FaEye />
                        </Link>

                        {/* 🗑️ Eliminar */}
                        <button
                          onClick={() => eliminarPresupuesto(p._id, p.cliente.razonSocial)}
                          className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors"
                          title="Eliminar presupuesto"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* 📄 PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-sm text-gray-400">
                  Mostrando{' '}
                  <span className="text-white font-medium">{inicio}-{fin}</span> de{' '}
                  <span className="text-white font-medium">{totalItems}</span> presupuestos
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => irAPagina(1)}
                    disabled={page === 1}
                    className="px-3 py-2 bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded hover:bg-gray-600 transition text-sm"
                    title="Primera página"
                  >
                    <FaChevronLeft className="inline" />
                    <FaChevronLeft className="inline -ml-1" />
                  </button>

                  <button
                    onClick={() => irAPagina(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded hover:bg-gray-600 transition text-sm"
                  >
                    Anterior
                  </button>

                  <span className="px-3 py-2 text-gray-300 text-sm">
                    Página <span className="text-white font-semibold">{page}</span> de{' '}
                    <span className="text-white font-semibold">{totalPages}</span>
                  </span>

                  <button
                    onClick={() => irAPagina(page + 1)}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded hover:bg-gray-600 transition text-sm"
                  >
                    Siguiente
                  </button>

                  <button
                    onClick={() => irAPagina(totalPages)}
                    disabled={page === totalPages}
                    className="px-3 py-2 bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded hover:bg-gray-600 transition text-sm"
                    title="Última página"
                  >
                    <FaChevronRight className="inline -mr-1" />
                    <FaChevronRight className="inline" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}