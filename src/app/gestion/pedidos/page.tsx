'use client';

import { useEffect, useState, useCallback } from 'react';
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
  FaCheck,
  FaSearch,
  FaUser,
  FaCalendarAlt,
  FaTimes
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
const ESTADO_CONFIG: Record<Pedido['estado'], { label: string; color: string; text: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-gray-500', text: 'text-gray-200' },
  preparacion: { label: 'En preparación', color: 'bg-amber-600', text: 'text-white' },
  enviado: { label: 'Enviado', color: 'bg-blue-600', text: 'text-white' },
  entregado: { label: 'Entregado', color: 'bg-green-600', text: 'text-white' },
  cancelado: { label: 'Cancelado', color: 'bg-red-600', text: 'text-white' },
};

const ESTADO_PAGO_CONFIG: Record<'pendiente' | 'parcial' | 'pagado', { label: string; color: string }> = {
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
   COMPONENTE PRINCIPAL
======================= */
export default function PedidosPage() {
  const isAuthorized = useAdminAuthorization();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidosEnCC, setPedidosEnCC] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 🆕 Estados del Buscador Premium
  const [searchMode, setSearchMode] = useState<'cliente' | 'fecha'>('cliente');
  const [searchCliente, setSearchCliente] = useState('');
  const [searchFechaInicio, setSearchFechaInicio] = useState('');
  const [searchFechaFin, setSearchFechaFin] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 🆕 Debounce para la búsqueda por cliente (evita spam de requests)
  const [debouncedSearchCliente, setDebouncedSearchCliente] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchCliente(searchCliente), 500);
    return () => clearTimeout(timer);
  }, [searchCliente]);

  /* =======================
     FETCH INICIAL + POLLING + BÚSQUEDA
  ======================= */
  useEffect(() => {
    if (!isAuthorized) return;

    setLoading(true);
    const fetchData = async () => {
      try {
        // 🆕 Construir query params dinámicamente
        const params = new URLSearchParams({ page: page.toString(), limit: '10' });
        
        if (searchMode === 'cliente' && debouncedSearchCliente.trim()) {
          params.append('cliente', debouncedSearchCliente.trim());
        } else if (searchMode === 'fecha') {
          if (searchFechaInicio) params.append('fechaInicio', searchFechaInicio);
          if (searchFechaFin) params.append('fechaFin', searchFechaFin);
        }

        const [resPedidos, resCC] = await Promise.all([
          fetch(`/api/gestion/pedidos?${params.toString()}`, { cache: 'no-store' }),
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
        setIsSearching(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 140000);
    return () => clearInterval(interval);
  }, [isAuthorized, page, searchMode, debouncedSearchCliente, searchFechaInicio, searchFechaFin]);

  /* =======================
     SSE (Sin cambios, sigue funcionando)
  ======================= */
  
  useEffect(() => {
    if (!isAuthorized) return;
    const es = new EventSource('/api/gestion/pedidos/events');
    es.onmessage = (event) => {
      if (!event.data || event.data === 'ping' || event.data === 'connected' || !event.data.startsWith('{')) return;
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
    es.onerror = () => { es.close(); };
    return () => es.close();
  }, [isAuthorized]);

  /* =======================
     HANDLERS DE BÚSQUEDA
  ======================= */
  const handleClearSearch = () => {
    setSearchCliente('');
    setSearchFechaInicio('');
    setSearchFechaFin('');
    setPage(1);
  };

  const handleSearchModeChange = (mode: 'cliente' | 'fecha') => {
    setSearchMode(mode);
    setPage(1); // Resetear paginación al cambiar modo
    handleClearSearch();
  };

  /* =======================
     AGREGAR A CUENTA CORRIENTE (Sin cambios)
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
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FaShoppingCart className="text-amber-400" />
            Gestión de Pedidos
          </h1>
          <p className="text-gray-400 mt-1">Seguimiento completo y búsqueda avanzada.</p>
          <p className="text-gray-400 text-sm">
            Volver a <Link href="/gestion" className="underline hover:text-amber-400 transition-colors">Gestión</Link>
          </p>
        </div>

        <Link href="/gestion/pedidos/nuevo" className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-amber-900/20 font-medium">
          <FaPlus /> Nuevo Pedido
        </Link>
      </div>
      

      {/* 🆕 BARRA DE BÚSQUEDA PREMIUM */}
      <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          
          {/* Selector de Modo */}
          <div className="flex bg-gray-900/80 p-1 rounded-lg border border-gray-700">
            <button
              onClick={() => handleSearchModeChange('cliente')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                searchMode === 'cliente' 
                  ? 'bg-amber-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <FaUser size={14} /> Por Cliente
            </button>
            <button
              onClick={() => handleSearchModeChange('fecha')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                searchMode === 'fecha' 
                  ? 'bg-amber-600 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <FaCalendarAlt size={14} /> Por Fecha
            </button>
          </div>

          {/* Inputs Dinámicos */}
          <div className="flex-1 w-full lg:w-auto flex flex-col sm:flex-row gap-3">
            {searchMode === 'cliente' ? (
              <div className="relative flex-1 group">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o razón social..."
                  value={searchCliente}
                  onChange={(e) => { setSearchCliente(e.target.value); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all placeholder-gray-500"
                />
              </div>
            ) : (
              <div className="flex-1 flex gap-3">
                <div className="relative flex-1 group">
                  <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    type="date"
                    value={searchFechaInicio}
                    onChange={(e) => { setSearchFechaInicio(e.target.value); setPage(1); }}
                    className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                  />
                </div>
                <span className="flex items-center text-gray-500 font-medium">hasta</span>
                <div className="relative flex-1 group">
                  <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    type="date"
                    value={searchFechaFin}
                    onChange={(e) => { setSearchFechaFin(e.target.value); setPage(1); }}
                    className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Botón Limpiar */}
            {(searchCliente || searchFechaInicio || searchFechaFin) && (
              <button
                onClick={handleClearSearch}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-all text-sm font-medium"
                title="Limpiar filtros"
              >
                <FaTimes /> Limpiar
              </button>
            )}
          </div>
        </div>
        
        {/* Indicador de búsqueda activa */}
        {(debouncedSearchCliente || searchFechaInicio || searchFechaFin) && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/80 animate-pulse">
            <FaSearch size={10} />
            <span>Buscando resultados...</span>
          </div>
        )}
      </div>

      {/* LISTADO */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-300 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando pedidos...</span>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
            <FaShoppingCart className="text-4xl text-gray-600" />
            <p>No se encontraron pedidos con los filtros actuales.</p>
            <button onClick={handleClearSearch} className="text-amber-400 hover:underline text-sm">Limpiar búsqueda</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {pedidos.map((pedido) => {
              const estadoLog = ESTADO_CONFIG[pedido.estado];
              const estadoPago = ESTADO_PAGO_CONFIG[pedido.estadoPago];
              const totalProductos = pedido.productos.reduce((sum, p) => sum + (p?.cantidad || 0), 0);
              const yaEnCtaCorriente = pedidosEnCC.has(pedido._id);

              return (
                <div key={pedido._id} className="p-4 hover:bg-gray-750 transition-colors group">
                  <div className="flex flex-col md:flex-row md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate flex items-center gap-2">
                        <span className="text-amber-500 font-mono text-sm">#{pedido._id.slice(-6).toUpperCase()}</span>
                        {yaEnCtaCorriente && <FaCheck className="text-green-500 text-xs" title="En Cta. Corriente" />}
                      </div>
                      <div className="text-gray-300 truncate font-medium mt-1">
                        {pedido.cliente?.razonSocial ?? 'Cliente desconocido'}
                      </div>
                      <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>{totalProductos} producto(s)</span>
                        <span className="text-gray-600">•</span>
                        <span>{pedido.deposito}</span>
                      </div>
                      <div className="text-sm text-gray-400 flex flex-wrap gap-3 mt-2">
                        <span className="flex items-center gap-1 bg-gray-900/50 px-2 py-1 rounded border border-gray-700">
                          <FaDollarSign className="text-amber-400" />
                          <span className="font-medium text-gray-200">{formatARS(pedido.total)}</span>
                        </span>
                        {pedido.fechaEstimadaEntrega && (
                          <span className="flex items-center gap-1 bg-gray-900/50 px-2 py-1 rounded border border-gray-700">
                            <FaClock className="text-blue-400" />
                            {new Date(pedido.fechaEstimadaEntrega).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-3">
                      <div className="flex flex-wrap gap-3 sm:justify-end">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Logística</span>
                          <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${estadoLog.color} ${estadoLog.text} whitespace-nowrap mt-0.5 shadow-sm`}>
                            {estadoLog.label}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Pago</span>
                          <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${estadoPago.color} text-white whitespace-nowrap mt-0.5 shadow-sm`}>
                            {estadoPago.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end mt-1">
                        {yaEnCtaCorriente ? (
                          <span className="px-3 py-1.5 text-xs rounded-lg bg-green-900/20 text-green-400 border border-green-700/50 flex items-center gap-1.5 font-medium">
                            <FaCheck size={12} /> En Cta. Corriente
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAgregarACtaCorriente(pedido)}
                            disabled={!pedido.cliente?._id || pedido.estado === 'cancelado'}
                            title="Registrar el total del pedido como deuda en la Cuenta Corriente del cliente"
                            className="text-amber-400 hover:text-amber-300 disabled:text-gray-600 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-amber-700/40 hover:border-amber-600 hover:bg-amber-900/20 transition font-medium"
                          >
                            <FaWallet /> Agregar a Cta. Cte.
                          </button>
                        )}

                        <Link
                          href={`/gestion/pedidos/${pedido._id}`}
                          className="text-gray-300 hover:text-white hover:bg-gray-700 flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-500 transition font-medium"
                        >
                          <FaEye /> Ver detalle
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
        <div className="flex justify-center items-center gap-2 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <button 
            onClick={() => setPage((p) => Math.max(1, p - 1))} 
            disabled={page === 1} 
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
          >
            ← Anterior
          </button>
          <span className="px-4 py-2 text-gray-300 text-sm font-medium bg-gray-900 rounded-lg border border-gray-700">
            Página {page} de {totalPages}
          </span>
          <button 
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
            disabled={page === totalPages} 
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}