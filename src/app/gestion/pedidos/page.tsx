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
  FaWallet,
  FaCheck
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
  const [pedidosEnCC, setPedidosEnCC] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* =======================
     FETCH INICIAL + POLLING
  ======================= */
  useEffect(() => {
    if (!isAuthorized) return;

    setLoading(true);
    const fetchData = async () => {
      try {
        // ✅ Hacemos ambas consultas en paralelo para mayor velocidad
        const [resPedidos, resCC] = await Promise.all([
          fetch(`/api/gestion/pedidos?page=${page}&limit=10`, { cache: 'no-store' }),
          fetch('/api/gestion/cuentas-corrientes?pedidosRegistrados=true', { cache: 'no-store' })
        ]);
        
        const { data, totalPages: total } = await resPedidos.json();
        const list = Array.isArray(data) ? data.map(sanitizePedido) : [];
        setPedidos(list);
        setTotalPages(total);

        if (resCC.ok) {
          const ccData = await resCC.json();
          setPedidosEnCC(new Set(ccData.pedidos || []));
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 140000);
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
          setPedidos((prev) => [sanitizePedido(parsed.data), ...prev]);
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nuevo pedido creado', timer: 2500, showConfirmButton: false });
        }

        if (parsed.type === 'pedido_estado_actualizado' || parsed.type === 'pedido_cancelado') {
          setPedidos((prev) => prev.map((p) => p._id === parsed.data._id ? sanitizePedido(parsed.data) : p));
          Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Pedido actualizado', timer: 2500, showConfirmButton: false });
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
     ✅ AGREGAR A CUENTA CORRIENTE
  ======================= */
  const handleAgregarACtaCorriente = async (pedido: Pedido) => {
    if (!pedido.cliente?._id) {
      Swal.fire('Error', 'El pedido no tiene un cliente asociado válido.', 'error');
      return;
    }

    if (pedido.total <= 0) {
      Swal.fire('Error', 'El pedido no tiene un total válido para registrar.', 'error');
      return;
    }

    const result = await Swal.fire({
      title: '¿Agregar a Cuenta Corriente?',
      html: `
        <div style="text-align: left; padding: 10px 0;">
          <p style="color: #d1d5db; margin-bottom: 10px;">Se registrará el total de este pedido como deuda en la cuenta corriente del cliente:</p>
          <div style="padding: 12px; background: #1f2937; border-radius: 8px; border: 1px solid #374151; margin-bottom: 10px;">
            <div style="font-size: 12px; color: #9ca3af;">Cliente</div>
            <div style="font-size: 14px; color: white; font-weight: 600;">${pedido.cliente.razonSocial}</div>
          </div>
          <div style="padding: 12px; background: #1f2937; border-radius: 8px; border: 1px solid #374151;">
            <div style="font-size: 12px; color: #9ca3af;">Importe a sumar como deuda</div>
            <div style="font-size: 20px; color: #f59e0b; font-weight: bold;">${formatARS(pedido.total)}</div>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, agregar a Cta. Cte.',
      cancelButtonText: 'Cancelar',
      background: '#1f2937',
      color: '#fff'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch('/api/gestion/cuentas-corrientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: pedido.cliente._id,
          pedidoId: pedido._id,
          tipo: 'pedido',
          importe: pedido.total,
          descripcion: `Pedido #${pedido._id.slice(-6).toUpperCase()}`,
          formaPago: 'Saldo Pendiente'
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // ✅ Agregar el ID al Set localmente para actualizar la UI al instante
        setPedidosEnCC(prev => new Set(prev).add(pedido._id));

        Swal.fire({
          icon: 'success',
          title: '¡Registrado en Cta. Corriente!',
          html: `Se sumó <strong>${formatARS(pedido.total)}</strong> a la deuda de <strong>${pedido.cliente.razonSocial}</strong>.<br><br>Saldo actual: <strong style="color: #f59e0b;">${formatARS(data.saldoActual)}</strong>`,
          confirmButtonColor: '#f59e0b',
          background: '#1f2937',
          color: '#fff'
        });
      } else {
        const err = await res.json();
        Swal.fire('Error', err.error || 'No se pudo registrar en Cuenta Corriente', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Error de conexión con el servidor', 'error');
    }
  };

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
            volver a gestion <Link href="/gestion" className="underline hover:text-amber-400"> Gestión </Link>
          </p>
        </div>

        <Link href="/gestion/pedidos/nuevo" className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
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
              const totalProductos = pedido.productos.reduce((sum, p) => sum + (p?.cantidad || 0), 0);
              
              // ✅ Verificar si ya está en Cuenta Corriente
              const yaEnCtaCorriente = pedidosEnCC.has(pedido._id);

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

                    {/* Columna derecha: estados + acciones */}
                    <div className="flex flex-col sm:items-end gap-2 sm:gap-3">
                      <div className="flex flex-wrap gap-3 sm:justify-end">
                        {/* Estado logístico */}
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-400">Logística</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${estadoLog.color} ${estadoLog.text} whitespace-nowrap mt-1`}>
                            {estadoLog.label}
                          </span>
                        </div>

                        {/* Estado de pago */}
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-400">Pago</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${estadoPago.color} text-white whitespace-nowrap mt-1`}>
                            {estadoPago.label}
                          </span>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end mt-1">
                        {/* ✅ LABEL o BOTÓN según el estado */}
                        {yaEnCtaCorriente ? (
                          <span className="px-3 py-1.5 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-700/50 flex items-center gap-1.5 font-medium">
                            <FaCheck size={12} /> Ya en Cta. Corriente
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAgregarACtaCorriente(pedido)}
                            disabled={!pedido.cliente?._id || pedido.estado === 'cancelado'}
                            title="Registrar el total del pedido como deuda en la Cuenta Corriente del cliente"
                            className="text-amber-400 hover:text-amber-300 disabled:text-gray-600 disabled:cursor-not-allowed flex items-center gap-1 text-sm px-2 py-1.5 rounded border border-amber-700/40 hover:border-amber-600 hover:bg-amber-900/20 transition"
                          >
                            <FaWallet /> Agregar a Cta. Corriente
                          </button>
                        )}

                        {/* Botón Ver */}
                        <Link
                          href={`/gestion/pedidos/${pedido._id}`}
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-sm px-2 py-1.5 rounded border border-amber-700/40 hover:border-amber-600 hover:bg-amber-900/20 transition"
                        >
                          <FaEye /> Ver
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 p-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50">
            ← Anterior
          </button>
          <span className="px-3 py-1 text-gray-300">Página {page} de {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50">
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}