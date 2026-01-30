'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import { FaFileInvoice, FaPlus, FaEye } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';

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

  const [vistos, setVistos] = useState<Set<string>>(new Set());
  const [nuevos, setNuevos] = useState<Set<string>>(new Set());

  const [ultimoConteo, setUltimoConteo] = useState(0);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const audioRef = useState<HTMLAudioElement | null>(
    typeof window !== 'undefined'
      ? new Audio('/sounds/new-notification-08-352461.mp3')
      : null
  )[0];

  /* ===============================
     DESBLOQUEAR AUDIO (1 CLICK)
  =============================== */
  useEffect(() => {
    if (!audioRef) return;

    const unlockAudio = () => {
      audioRef.volume = 0.6;
      audioRef
        .play()
        .then(() => {
          audioRef.pause();
          audioRef.currentTime = 0;
          setAudioUnlocked(true);
        })
        .catch(() => {});
      window.removeEventListener('click', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, [audioRef]);

  /* ===============================
     CARGA INICIAL DE VISTOS
  =============================== */
  useEffect(() => {
    const saved = localStorage.getItem('presupuestos_vistos');
    if (saved) setVistos(new Set(JSON.parse(saved)));
  }, []);

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

      const nuevosIds = data
        .map((p: Presupuesto) => p._id)
        .filter((id: string) => !vistos.has(id));

      if (audioUnlocked && nuevosIds.length > ultimoConteo && ultimoConteo !== 0) {
        audioRef!.currentTime = 0;
        audioRef!.play().catch(() => {});
      }

      setUltimoConteo(nuevosIds.length);
      setNuevos(new Set(nuevosIds));
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudieron cargar', 'error');
    } finally {
      setLoading(false);
    }
  }, [auth, page, vistos, ultimoConteo, audioUnlocked, audioRef]);

  /* ===============================
     MARCAR COMO VISTO
  =============================== */
  const marcarComoVisto = (id: string) => {
    setVistos(prev => {
      const updated = new Set(prev);
      updated.add(id);
      localStorage.setItem(
        'presupuestos_vistos',
        JSON.stringify(Array.from(updated))
      );
      return updated;
    });

    setNuevos(prev => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
  };

  /* ===============================
     REFRESH SOLO CON FOCO
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
     ESTADOS DE AUTORIZACIÓN
  =============================== */
  if (auth === null)
    return (
      <div className="p-6 text-center text-gray-400 min-h-screen flex items-center justify-center">
        Verificando acceso...
      </div>
    );

  if (auth === false) return null;

  /* ===============================
     RENDER
  =============================== */
  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <AnimatePresence>
            {nuevos.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-2 inline-flex bg-amber-500 text-black px-3 py-1 rounded-full text-sm font-semibold"
              >
                🆕 {nuevos.size} nuevo{nuevos.size > 1 ? 's' : ''}
              </motion.div>
            )}
          </AnimatePresence>

          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FaFileInvoice className="text-amber-400" />
            Gestión de Presupuestos
          </h1>
        </div>

        <Link
          href="/gestion/presupuestos/nuevo"
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus />
          Nuevo Presupuesto
        </Link>
      </div>

      {/* LISTADO */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-300">
            Cargando presupuestos...
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {presupuestos.map(p => {
              const esNuevo = nuevos.has(p._id);

              return (
                <motion.div
                  key={p._id}
                  initial={esNuevo ? { opacity: 0, scale: 0.97 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
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
                      <div className="text-sm text-gray-400">
                        ${p.total.toFixed(2)} •{' '}
                        {new Date(p.createdAt).toLocaleDateString('es-AR')}
                      </div>
                    </div>

                    <div className="flex gap-3 items-center">
                      {esNuevo && (
                        <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded font-semibold">
                          🆕
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

                      <Link
                        href={`/gestion/presupuestos/imprimir/${p._id}`}
                        onClick={() => marcarComoVisto(p._id)}
                        className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1"
                      >
                        <FaEye /> Ver
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
