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

/* =======================
   CONFIG ESTADOS PAGO
======================= */


const ESTADO_PAGO_CONFIG: Record<
  'pendiente' | 'parcial' | 'pagado',
  { label: string; color: string }
> = {
  pendiente: { label: 'Pago pendiente', color: 'bg-red-600' },
  parcial: { label: 'Pago parcial', color: 'bg-yellow-600' },
  pagado: { label: 'Pagado', color: 'bg-green-600' },
};

/* =======================
   SANITIZADOR (CLAVE)
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
   COMPONENTE
======================= */
export default function PedidosPage() {
  const isAuthorized = useAdminAuthorization();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* =======================
     FETCH INICIAL + POLLING
  ======================= */


  useEffect(() => {
    if (!isAuthorized) return;

    setLoading(true);
    const fetchPedidos = async () => {
      try {
        const res = await fetch(`/api/gestion/pedidos?page=${page}&limit=10`, { cache: 'no-store' });
        const { data, totalPages: total } = await res.json();
        const list = Array.isArray(data) ? data.map(sanitizePedido) : [];
        setPedidos(list);
        setTotalPages(total);
      } catch (err) {
        console.error('Error al cargar pedidos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
 const interval = setInterval(fetchPedidos, 140000); // ✅ Cada 2 minutos
    return () => clearInterval(interval);
  }, [isAuthorized, page]);


  /* =======================
     SSE
  ======================= */
  useEffect(() => {
    if (!isAuthorized) return;

    const es = new EventSource('/api/gestion/pedidos/events');

    es.onmessage = (event) => {
      if (!event.data) return;
      if (event.data === 'ping' || event.data === 'connected') return;
      if (!event.data.startsWith('{')) return;

      try {
        const parsed = JSON.parse(event.data);

        if (parsed.type === 'pedido_creado') {
          setPedidos((prev) => [
            sanitizePedido(parsed.data),
            ...prev,
          ]);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Nuevo pedido creado',
            timer: 2500,
            showConfirmButton: false,
          });
        }

        if (
          parsed.type === 'pedido_estado_actualizado' ||
          parsed.type === 'pedido_cancelado'
        ) {
          setPedidos((prev) =>
            prev.map((p) =>
              p._id === parsed.data._id
                ? sanitizePedido(parsed.data)
                : p
            )
          );

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: 'Pedido actualizado',
            timer: 2500,
            showConfirmButton: false,
          });
        }
      } catch (err) {
        console.error('Error procesando SSE:', err);
      }
    };

    es.onerror = () => {
      console.warn('SSE pedidos desconectado');
      es.close();
    };

    return () => es.close();
  }, [isAuthorized]);

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
          <p className="text-gray-400 mt-1">
            Seguimiento completo de pedidos.
          </p>
          <p className="text-gray-400 text-sm">volver a gestion
            <Link href="/gestion" className="underline hover:text-amber-400"> Gestión </Link>
          </p>
        </div>

        <Link
          href="/gestion/pedidos/nuevo"
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition" >

          <FaPlus /> Nuevo Pedido
        </Link>
      </div>

      {/* LISTADO */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-300">
            Cargando pedidos...
          </div>
        ) : pedidos.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No hay pedidos registrados.
          </div>
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
                <div key={pedido._id} className="p-4 hover:bg-gray-750 transition-colors">
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
                            {new Date(pedido.fechaEstimadaEntrega).toLocaleDateString()}
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
      </div>
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
