'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import {
  FaShoppingCart,
  FaPlus,
  FaClock,
  FaDollarSign,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { formatARS } from '@/app/lib/formatcurrenci';

/* =======================
   TIPOS
======================= */
interface ClientePedido {
  _id?: string;
  razonSocial: string;
}

interface ProductoPedido {
  nombre?: string;
  cantidad: number;
  tipoPrecio?: 'mayorista' | 'oferta';
}

interface Pedido {
  _id: string;
  cliente: ClientePedido;
  productos: ProductoPedido[];
  estado: 'pendiente' | 'preparacion' | 'enviado' | 'entregado' | 'cancelado';
  estadoPago: 'pendiente' | 'parcial' | 'pagado';
  deposito: string;
  fechaEstimadaEntrega?: string;
  total: number;
  createdAt?: string;
}

/* =======================
   CONFIG ESTADOS
======================= */
const ESTADO_CONFIG: Record<
  Pedido['estado'],
  { label: string; color: string; text: string }
> = {
  pendiente: { label: 'Pendiente', color: 'bg-gray-500', text: 'text-gray-200' },
  preparacion: { label: 'En preparación', color: 'bg-amber-600', text: 'text-white' },
  enviado: { label: 'Enviado', color: 'bg-blue-600', text: 'text-white' },
  entregado: { label: 'Entregado', color: 'bg-green-600', text: 'text-white' },
  cancelado: { label: 'Cancelado', color: 'bg-red-600', text: 'text-white' },
};

const ESTADO_PAGO_CONFIG: Record<
  'pendiente' | 'parcial' | 'pagado',
  { label: string; color: string }
> = {
  pendiente: { label: 'Pago pendiente', color: 'bg-red-600' },
  parcial: { label: 'Pago parcial', color: 'bg-yellow-600' },
  pagado: { label: 'Pagado', color: 'bg-green-600' },
};

/* =======================
   SANITIZADOR
======================= */
const sanitizePedido = (p: any): Pedido => ({
  _id: String(p?._id ?? ''),
  cliente: p?.cliente ?? { razonSocial: 'Cliente desconocido' },
  productos: Array.isArray(p?.productos) ? p.productos : [],
  estado: p?.estado ?? 'pendiente',
  estadoPago: p?.estadoPago ?? 'pendiente',
  deposito: p?.deposito ?? '-',
  fechaEstimadaEntrega: p?.fechaEstimadaEntrega,
  total: Number(p?.total) || 0,
  createdAt: p?.createdAt,
});

/* =======================
   CONFIG PAGINACIÓN
======================= */
const ITEMS_POR_PAGINA = 10;

/* =======================
   COMPONENTE
======================= */
export default function PedidosPage() {
  const isAuthorized = useAdminAuthorization();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  // 📄 Estados de paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* =======================
     FETCH INICIAL (solo al montar o cambiar página)
     ✅ SIN POLLING - Solo SSE para actualizaciones
  ======================= */


  useEffect(() => {
    if (!isAuthorized) return;

    let mounted = true;

    const fetchPedidos = async () => {
      if (!mounted) return;

      try {
        setLoading(true);
        const res = await fetch(
          `/api/gestion/pedidos?page=${page}&limit=${ITEMS_POR_PAGINA}`,
          { cache: 'no-store' }
        );

        if (!res.ok) throw new Error('Error al cargar pedidos');

        // ✅ CORRECCIÓN: Nombres distintos para cada propiedad
        const { data, totalPages, totalItems } = await res.json();

        if (mounted) {
          const list = Array.isArray(data) ? data.map(sanitizePedido) : [];
          setPedidos(list);
          setTotalPages(totalPages);        // 👈 totalPages va a totalPages
          setTotalItems(totalItems ?? 0);   // 👈 totalItems va a totalItems
        }
      } catch (err) {
        console.error('Error al cargar pedidos:', err);
        if (mounted) {
          Swal.fire('Error', 'No se pudieron cargar los pedidos', 'error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPedidos();

    // Cleanup al desmontar o cambiar página
    return () => {
      mounted = false;
    };
  }, [isAuthorized, page]);

  /* =======================
     SSE - ÚNICO MECANISMO DE ACTUALIZACIÓN EN TIEMPO REAL
     ✅ Reemplaza al polling - Solo consume cuando hay cambios reales
  ======================= */
  useEffect(() => {
    if (!isAuthorized) return;

    const es = new EventSource('/api/gestion/pedidos/events');

    es.onmessage = (event) => {
      if (!event.data || event.data === 'ping' || event.data === 'connected') return;
      if (!event.data.startsWith('{')) return;

      try {
        const parsed = JSON.parse(event.data);

        // 👇 Solo actualizar si estamos en página 1 (la más reciente)
        const enPrimeraPagina = page === 1;

        if (parsed.type === 'pedido_creado' && enPrimeraPagina) {
          // Insertar al inicio y mantener límite de página
          setPedidos((prev) => {
            const nuevo = sanitizePedido(parsed.data);
            const actualizado = [nuevo, ...prev];
            return actualizado.length > ITEMS_POR_PAGINA
              ? actualizado.slice(0, ITEMS_POR_PAGINA)
              : actualizado;
          });

          // Notificación toast sutil
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: '🆕 Nuevo pedido',
            timer: 2000,
            showConfirmButton: false,
          });
        }

        if (
          parsed.type === 'pedido_estado_actualizado' ||
          parsed.type === 'pedido_cancelado'
        ) {
          // Actualizar solo si el pedido está en la página actual
          setPedidos((prev) =>
            prev.map((p) =>
              p._id === parsed.data._id ? sanitizePedido(parsed.data) : p
            )
          );
        }
      } catch (err) {
        console.error('Error procesando SSE:', err);
      }
    };

    es.onerror = (err) => {
      console.warn('SSE desconectado, reconectando...', err);
      es.close();
    };

    // Cleanup al desmontar
    return () => {
      es.close();
    };
  }, [isAuthorized, page]);

  /* =======================
     PAGINACIÓN CON SCROLL
  ======================= */
  const irAPagina = (nuevaPagina: number) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPages) return;
    setPage(nuevaPagina);
    // Scroll suave al inicio del listado
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cálculos para mostrar rango visible
  const inicio = totalItems > 0 ? (page - 1) * ITEMS_POR_PAGINA + 1 : 0;
  const fin = totalItems > 0 ? Math.min(page * ITEMS_POR_PAGINA, totalItems) : 0;

  /* =======================
     AUTH STATES
  ======================= */
  if (!isAuthorized) {
    return (
      <div className="p-6 text-center text-gray-400 min-h-screen flex items-center justify-center">
        Verificando acceso...
      </div>
    );
  }

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FaShoppingCart className="text-amber-400" />
            Gestión de Pedidos
          </h1>
          <p className="text-gray-400 mt-1">Seguimiento completo de pedidos.</p>
          <p className="text-gray-400 text-sm">
            volver a gestión{' '}
            <Link href="/gestion" className="underline hover:text-amber-400">
              Gestión
            </Link>
          </p>
        </div>

        <Link
          href="/gestion/pedidos/nuevo"
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <FaPlus /> Nuevo Pedido
        </Link>
      </div>

      {/* LISTADO */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-300">Cargando pedidos...</div>
        ) : pedidos.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No hay pedidos registrados.</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {pedidos.map((pedido) => {
              const estadoLog = ESTADO_CONFIG[pedido.estado];
              const estadoPago = ESTADO_PAGO_CONFIG[pedido.estadoPago];
              const totalProductos = pedido.productos.reduce(
                (sum, p) => sum + (p?.cantidad || 0),
                0
              );

              return (
                <div
                  key={pedido._id}
                  className="p-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:justify-between gap-4">
                    {/* Columna izquierda: info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        Pedido #{pedido._id.slice(-6).toUpperCase()}
                      </div>
                      <div className="text-gray-300 truncate">
                        {pedido.cliente?.razonSocial ?? 'Cliente desconocido'}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {totalProductos} producto(s) • {pedido.deposito}
                      </div>
                      <div className="text-sm text-gray-400 flex flex-wrap gap-3 mt-2">
                        <span className="flex items-center gap-1">
                          <FaDollarSign className="text-amber-400" />
                          <span className="font-medium">{formatARS(pedido.total)}</span>
                        </span>
                        {pedido.fechaEstimadaEntrega && (
                          <span className="flex items-center gap-1">
                            <FaClock className="text-blue-400" />
                            {new Date(pedido.fechaEstimadaEntrega).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Columna derecha: estados + acción */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      {/* Estado logístico */}
                      <div className="flex flex-col items-end sm:items-start">
                        <span className="text-xs text-gray-400">Logística</span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${estadoLog.color} ${estadoLog.text} whitespace-nowrap mt-1`}
                        >
                          {estadoLog.label}
                        </span>
                      </div>

                      {/* Estado de pago */}
                      <div className="flex flex-col items-end sm:items-start">
                        <span className="text-xs text-gray-400">Pago</span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${estadoPago.color} text-white whitespace-nowrap mt-1`}
                        >
                          {estadoPago.label}
                        </span>
                      </div>

                      {/* Botón Ver */}
                      <Link
                        href={`/gestion/pedidos/${pedido._id}`}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-2 sm:mt-0"
                      >
                        <FaEye /> Ver
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 📄 PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 border-t border-gray-700">
            <span className="text-sm text-gray-400">
              Mostrando{' '}
              <span className="text-white font-medium">
                {inicio}-{fin}
              </span>{' '}
              de{' '}
              <span className="text-white font-medium">{totalItems}</span> pedidos
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
      </div>
    </div>
  );
}