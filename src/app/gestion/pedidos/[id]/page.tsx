'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import {
  FaUser, FaWarehouse, FaClock, FaArrowLeft, FaPrint, FaEdit, FaTrash,
  FaPlus, FaFileInvoice, FaSearch, FaTimes, FaWeightHanging, FaDollarSign,
  FaCheck, FaSync, FaMoneyBillWave, FaExclamationCircle
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import { formatARS } from '@/app/lib/formatcurrenci';

const CONCEPTO_MANUAL_ID = '000000000000000000000000';

interface Cliente {
  _id: string; razonSocial: string; nombre: string; apellido: string;
  direccion?: string; telefono?: string; tipoCliente?: 'minorista' | 'mayorista';
}

interface Producto {
  _id: string; nombre: string; unidad: string; cantidad: number;
  tipoPrecio: 'mayorista' | 'oferta'; precioAplicado: number; subtotal: number; producto: string;
}

interface ProductoSimple {
  _id: string; nombre: string; unidad: string; precio: { mayorista: number; oferta: number; };
}

interface Pedido {
  _id: string; cliente: Cliente; productos: Producto[];
  estado: 'pendiente' | 'preparacion' | 'enviado' | 'entregado' | 'cancelado';
  estadoPago: 'pendiente' | 'parcial' | 'pagado';
  deposito: string; fechaEstimadaEntrega?: string; notas?: string; total: number; createdAt: string;
}



const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', preparacion: 'En preparación', enviado: 'Enviado',
  entregado: 'Entregado', cancelado: 'Cancelado',
};
const ESTADO_OPCIONES = ['pendiente', 'preparacion', 'enviado', 'entregado', 'cancelado'] as const;

const ESTADO_PAGO_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pendiente: { label: 'Pago Pendiente', color: 'text-red-400', bgColor: 'bg-red-900/30 border-red-700/50' },
  parcial: { label: 'Pago Parcial', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30 border-yellow-700/50' },
  pagado: { label: 'Pagado', color: 'text-green-400', bgColor: 'bg-green-900/30 border-green-700/50' },
};


// ✅ ARRAY DE FORMAS DE PAGO CON CUENTA CORRIENTE INCLUIDA
const FORMAS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'qr', label: 'QR' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'cuenta_corriente', label: 'Cuenta Corriente' },
  { value: 'otro', label: 'Otro' },
];



const formatCantidad = (cantidad: number, unidad: string): string => {
  if (unidad === 'kg' || unidad === 'litro') return cantidad.toFixed(3).replace('.', ',');
  return Math.round(cantidad).toString();
};

const getUnidadTexto = (cantidad: number, unidad: string): string => {
  if (unidad === 'kg') return 'kg';
  if (unidad === 'litro') return cantidad === 1 ? 'litro' : 'litros';
  if (unidad === 'unidad') return cantidad === 1 ? 'unidad' : 'unidades';
  return unidad;
};

export default function DetallePedidoPage() {
  const isAuthorized = useAdminAuthorization();
  const { id } = useParams() as { id?: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [saldoPendiente, setSaldoPendiente] = useState<number | null>(null);
  const [totalPagado, setTotalPagado] = useState<number>(0);

  const [editandoProducto, setEditandoProducto] = useState<number | null>(null);
  const [cantidadTemporal, setCantidadTemporal] = useState<number>(1);
  const [precioTemporal, setPrecioTemporal] = useState<number>(0);
  const [actualizarProductoBase, setActualizarProductoBase] = useState<boolean>(false);

  const [productosDisponibles, setProductosDisponibles] = useState<ProductoSimple[]>([]);
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [cantidadNuevo, setCantidadNuevo] = useState<number>(1);
  const [precioNuevo, setPrecioNuevo] = useState<number>(0);
  const [actualizarProductoNuevo, setActualizarProductoNuevo] = useState<boolean>(false);
  const [busquedaProducto, setBusquedaProducto] = useState<string>('');

  const [mostrarImporteManual, setMostrarImporteManual] = useState(false);
  const [montoImporteManual, setMontoImporteManual] = useState<number>(0);
  const [descImporteManual, setDescImporteManual] = useState<string>('Importe adeudado');
  const [formaPagoImporteManual, setFormaPagoImporteManual] = useState<string>('otro');

  const fetchProductos = async () => {
    const res = await fetch('/api/gestion/productos/lista-simple');
    const data = await res.json();
    setProductosDisponibles(data);
  };

  useEffect(() => { fetchProductos(); }, []);

  const fetchPedidoData = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/gestion/pedidos/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Pedido no encontrado');
      const data = await res.json();
      setPedido(data);
      return data;
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudo cargar el pedido', 'error');
      router.push('/gestion/pedidos');
    }
  };

  useEffect(() => {
    if (!isAuthorized || !id) return;
    const init = async () => {
      await fetchPedidoData();
      setLoading(false);
    };
    init();
  }, [isAuthorized, id, router]);


  useEffect(() => {
    if (!id || !pedido) return;
    const fetchSaldo = async () => {
      try {
        const res = await fetch(`/api/gestion/pedidos/${id}/saldo`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setSaldoPendiente(data.saldoPendiente);
          setTotalPagado(data.totalPagado || 0);
        }
      } catch (err) {
        console.error('Error al cargar saldo:', err);
      }
    };
    fetchSaldo();
  }, [id, pedido]);

  if (!isAuthorized) return null;
  if (loading) return <div className="p-8 text-center text-gray-400">Cargando pedido...</div>;
  if (!pedido) return null;

  const productosFiltrados = productosDisponibles.filter(p => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase().trim()));
  const unidadSeleccionada = productoSeleccionado ? productosDisponibles.find(p => p._id === productoSeleccionado)?.unidad : null;

  const handleCambiarEstado = async (nuevoEstado: string) => {
    const result = await Swal.fire({ title: '¿Cambiar estado?', text: `¿Seguro que deseas cambiar el estado a "${ESTADO_LABEL[nuevoEstado]}"?`, icon: 'question', showCancelButton: true, confirmButtonColor: '#3b82f6', cancelButtonColor: '#6b7280', confirmButtonText: 'Sí, actualizar', cancelButtonText: 'Cancelar' });
    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/gestion/pedidos/${id}/estado`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: nuevoEstado }) });
        if (res.ok) {
          Swal.fire('¡Actualizado!', 'El estado del pedido ha sido actualizado.', 'success');
          await fetchPedidoData();
        } else {
          const error = await res.json();
          Swal.fire('Error', error.error || 'No se pudo actualizar el estado', 'error');
        }
      } catch (err) { Swal.fire('Error', 'Error de conexión con el servidor', 'error'); }
    }
  };

  const iniciarEdicion = (idx: number, cantidad: number, precio: number) => {
    setEditandoProducto(idx); setCantidadTemporal(cantidad); setPrecioTemporal(precio); setActualizarProductoBase(false);
  };

  const guardarCantidadYPrecio = async (idx: number) => {
    if (cantidadTemporal <= 0 || isNaN(cantidadTemporal) || precioTemporal <= 0 || isNaN(precioTemporal)) {
      Swal.fire('Error', 'La cantidad y el precio deben ser mayores a 0', 'error'); return;
    }
    const cantidadValidada = parseFloat(cantidadTemporal.toFixed(3));
    try {
      const res = await fetch(`/api/gestion/pedidos/${id}/producto/${idx}/cantidad`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevaCantidad: cantidadValidada, nuevoPrecio: precioTemporal, actualizarProducto: actualizarProductoBase }),
      });
      if (res.ok) {
        await fetchPedidoData();
        setEditandoProducto(null);
        Swal.fire({ icon: 'success', title: '¡Actualizado!', timer: 3000 });
      } else { Swal.fire('Error', (await res.json()).error || 'No se pudo actualizar', 'error'); }
    } catch (err) { Swal.fire('Error', 'Error de conexión', 'error'); }
  };



  const eliminarProducto = async (idx: number, nombre: string) => {
    const result = await Swal.fire({ title: '¿Eliminar producto?', text: `¿Seguro que deseas eliminar "${nombre}" del pedido?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d32f2f', cancelButtonColor: '#6b7280', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/gestion/pedidos/${id}/producto/${idx}`, { method: 'DELETE' });
        if (res.ok) {
          await fetchPedidoData();
          Swal.fire('¡Eliminado!', 'El producto fue removido del pedido.', 'success');
        }
        else { Swal.fire('Error', (await res.json()).error || 'No se pudo eliminar', 'error'); }
      } catch (err) { Swal.fire('Error', 'Error de conexión', 'error'); }
    }
  };

  const handleAgregarProducto = async () => {
    if (!productoSeleccionado || cantidadNuevo <= 0 || isNaN(cantidadNuevo) || precioNuevo <= 0 || isNaN(precioNuevo)) {
      Swal.fire('Error', 'Selecciona un producto, cantidad y precio válidos', 'error'); return;
    }
    const cantidadValidada = parseFloat(cantidadNuevo.toFixed(3));
    try {
      const res = await fetch(`/api/gestion/pedidos/${id}/producto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId: productoSeleccionado, cantidad: cantidadValidada, precioPersonalizado: precioNuevo, actualizarProducto: actualizarProductoNuevo }),
      });
      if (res.ok) {
        await fetchPedidoData();
        setMostrarAgregar(false); setProductoSeleccionado(''); setCantidadNuevo(1); setPrecioNuevo(0); setActualizarProductoNuevo(false); setBusquedaProducto('');
        Swal.fire({ icon: 'success', title: '¡Agregado!', timer: 3000 });
      } else { Swal.fire('Error', (await res.json()).error || 'No se pudo agregar', 'error'); }
    } catch (err) { Swal.fire('Error', 'Error de conexión', 'error'); }
  };



  const handleRegistrarImporteManual = async () => {
    if (montoImporteManual <= 0) {
      Swal.fire('Error', 'El monto debe ser mayor a 0', 'error');
      return;
    }

    try {
      const resPedido = await fetch(`/api/gestion/pedidos/${id}/producto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: CONCEPTO_MANUAL_ID,
          nombrePersonalizado: `💰 PAGO EN CONCEPTO DE: ${descImporteManual}`,
          unidadPersonalizada: 'unidad',
          cantidad: 1,
          precioPersonalizado: montoImporteManual,
          actualizarProducto: false
        }),
      });

      if (!resPedido.ok) throw new Error('No se pudo agregar el concepto al pedido');

      // ✅ AHORA USA LA FORMA DE PAGO SELECCIONADA
      const resPago = await fetch('/api/gestion/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: pedido.cliente._id,
          pedidoId: id,
          monto: montoImporteManual,
          formaPago: formaPagoImporteManual, // ← CAMBIO CLAVE: usa la forma seleccionada
          referencia: descImporteManual,
          notas: descImporteManual
        }),
      });

      if (!resPago.ok) throw new Error('No se pudo registrar el pago');

      await fetchPedidoData();
      const saldoRes = await fetch(`/api/gestion/pedidos/${id}/saldo`, { cache: 'no-store' });
      if (saldoRes.ok) {
        const saldoData = await saldoRes.json();
        setSaldoPendiente(saldoData.saldoPendiente);
        setTotalPagado(saldoData.totalPagado || 0);
      }

      const formaPagoLabel = FORMAS_PAGO.find(f => f.value === formaPagoImporteManual)?.label || formaPagoImporteManual;

      Swal.fire({
        icon: 'success',
        title: '¡Registrado!',
        html: `Se agregó el concepto al ticket y se registró el pago de <strong>${formatARS(montoImporteManual)}</strong><br/><small>Forma de pago: ${formaPagoLabel}</small>`,
        confirmButtonColor: '#10b981'
      });

      setMostrarImporteManual(false);
      setMontoImporteManual(0);
      setDescImporteManual('Importe adeudado');
      setFormaPagoImporteManual('otro'); // Resetear al valor por defecto

    } catch (err: any) {
      Swal.fire('Error', err.message || 'Error de conexión con el servidor', 'error');
    }
  };



  const handleRegistrarPago = async () => {
    const montoDefault = saldoPendiente && saldoPendiente > 0 ? saldoPendiente : pedido.total;

    const { value: formValues } = await Swal.fire({
      title: 'Registrar Pago - Si el pedido esta en Cta. Cte el metodo de pago es cuenta corriente',

      html: `
        <div style="text-align: left; padding: 10px 0;">
          <div style="margin-bottom: 15px; padding: 10px; background: #1f2937; border-radius: 8px; border: 1px solid #374151;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Saldo pendiente del pedido:</div>
            <div style="font-size: 20px; font-weight: bold; color: #f59e0b;">${formatARS(montoDefault)}</div>
          </div>
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Monto *</label>
          <input id="swal-monto" type="number" step="0.01" min="0.01" value="${montoDefault}" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" 
            placeholder="0.00" />
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Forma de pago *</label>
          <select id="swal-forma-pago" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;">
            ${FORMAS_PAGO.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
          </select>
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Referencia (opcional)</label>
          <input id="swal-referencia" type="text" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" 
            placeholder="Ej: N° de transacción" />
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Notas (opcional)</label>
          <textarea id="swal-notas" rows="2" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; resize: vertical;" 
            placeholder="Observaciones adicionales"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Registrar Pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      background: '#1f2937',
      color: '#fff',
      preConfirm: () => {
        const monto = parseFloat((document.getElementById('swal-monto') as HTMLInputElement).value);
        const formaPago = (document.getElementById('swal-forma-pago') as HTMLSelectElement).value;
        const referencia = (document.getElementById('swal-referencia') as HTMLInputElement).value;
        const notas = (document.getElementById('swal-notas') as HTMLTextAreaElement).value;

        if (!monto || monto <= 0) {
          Swal.showValidationMessage('El monto debe ser mayor a 0');
          return false;
        }

        return { monto, formaPago, referencia, notas };
      }
    });

    if (formValues) {
      try {
        const res = await fetch('/api/gestion/pagos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: pedido.cliente._id,
            pedidoId: id,
            monto: formValues.monto,
            formaPago: formValues.formaPago,
            referencia: formValues.referencia || undefined,
            notas: formValues.notas || undefined
          })
        });

        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: '¡Pago Registrado!',
            text: `Se registró un pago de ${formatARS(formValues.monto)} por ${FORMAS_PAGO.find(f => f.value === formValues.formaPago)?.label}`,
            timer: 3000,
            showConfirmButton: false
          });

          await fetchPedidoData();
          const saldoRes = await fetch(`/api/gestion/pedidos/${id}/saldo`, { cache: 'no-store' });
          if (saldoRes.ok) {
            const saldoData = await saldoRes.json();
            setSaldoPendiente(saldoData.saldoPendiente);
            setTotalPagado(saldoData.totalPagado || 0);
          }
        } else {
          const err = await res.json();
          Swal.fire('Error', err.error || 'No se pudo registrar el pago', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión con el servidor', 'error');
      }
    }
  };

  const estadoPagoConfig = ESTADO_PAGO_CONFIG[pedido.estadoPago] || ESTADO_PAGO_CONFIG.pendiente;
  const porcentajePagado = pedido.total > 0 ? Math.min(100, (totalPagado / pedido.total) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/gestion/pedidos" className="text-amber-500 hover:text-amber-400 flex items-center gap-1"><FaArrowLeft /> Volver a pedidos</Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Pedido #{pedido._id.slice(-6).toUpperCase()}</h1>
        <Link href="/gestion/cuentas-corrientes" className="text-amber-500 hover:text-amber-400 flex items-center gap-1"><FaWarehouse /> Cuentas Corrientes</Link>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-750 p-4 rounded-lg">
            <h3 className="font-medium text-amber-400 mb-2 flex items-center gap-2"><FaUser /> Cliente</h3>
            <p className="text-white">{pedido.cliente.razonSocial}</p>
            <p className="text-gray-300 text-sm">{pedido.cliente.nombre} {pedido.cliente.apellido} <br />{pedido.cliente.direccion} <br />{pedido.cliente.telefono}</p>
          </div>
          <div className="bg-gray-750 p-4 rounded-lg">
            <h3 className="font-medium text-amber-400 mb-2 flex items-center gap-2"><FaWarehouse /> Depósito y entrega</h3>
            <p className="text-white">Depósito: {pedido.deposito}</p>
            {pedido.fechaEstimadaEntrega && <p className="text-gray-300 text-sm"><FaClock className="inline mr-1 text-xs" /> Entrega estimada: {new Date(pedido.fechaEstimadaEntrega).toLocaleDateString()}</p>}
          </div>
        </div>

        <div className={`mb-6 p-4 rounded-lg border ${estadoPagoConfig.bgColor}`}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FaExclamationCircle className={estadoPagoConfig.color} />
                <span className={`text-lg font-bold ${estadoPagoConfig.color}`}>{estadoPagoConfig.label}</span>
              </div>
              <div className="text-sm text-gray-300">
                Total: <strong className="text-white">{formatARS(pedido.total)}</strong> •
                Pagado: <strong className="text-green-400">{formatARS(totalPagado)}</strong> •
                Pendiente: <strong className="text-amber-400">{formatARS(saldoPendiente ?? pedido.total)}</strong>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <div className="text-xs text-gray-400 mb-1">Progreso de pago</div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${porcentajePagado >= 100 ? 'bg-green-500' :
                    porcentajePagado > 0 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  style={{ width: `${porcentajePagado}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1 text-right">{porcentajePagado.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Estado actual</label>
          <div className="flex flex-wrap gap-2">
            {ESTADO_OPCIONES.map((estado) => (
              <button key={estado} onClick={() => handleCambiarEstado(estado)} className={`px-3 py-1 text-xs rounded-full ${pedido.estado === estado ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                {ESTADO_LABEL[estado]}
              </button>
            ))}
          </div>
        </div>

        {['preparacion', 'enviado', 'entregado'].includes(pedido.estado) && (
          <div className="mb-4">
            <button onClick={() => setMostrarAgregar(!mostrarAgregar)} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm"><FaPlus size={12} /> Agregar producto al pedido</button>
            {mostrarAgregar && (
              <div className="mt-3 p-4 bg-gray-750 rounded-lg border border-gray-600">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Buscar producto</label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" value={busquedaProducto} onChange={(e) => setBusquedaProducto(e.target.value)} placeholder="Escribe para buscar..." className="w-full pl-10 pr-10 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500" autoFocus />
                    {busquedaProducto && <button onClick={() => setBusquedaProducto('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"><FaTimes size={16} /></button>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Producto</label>
                    <select value={productoSeleccionado} onChange={(e) => {
                      setProductoSeleccionado(e.target.value);
                      const prod = productosDisponibles.find(p => p._id === e.target.value);
                      if (prod) {
                        setCantidadNuevo(prod.unidad === 'kg' || prod.unidad === 'litro' ? 0.000 : 1);
                        setPrecioNuevo(prod.precio.oferta && prod.precio.oferta < prod.precio.mayorista ? prod.precio.oferta : prod.precio.mayorista);
                      }
                    }} className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500" size={Math.min(5, productosFiltrados.length)}>
                      <option value="">Seleccionar producto...</option>
                      {productosFiltrados.map((p) => (<option key={p._id} value={p._id}>{p.nombre} ({p.unidad}) - {formatARS(p.precio.oferta && p.precio.oferta < p.precio.mayorista ? p.precio.oferta : p.precio.mayorista)}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1"><FaWeightHanging className="text-amber-400" /> Cantidad ({unidadSeleccionada || 'unidad'})</label>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setCantidadNuevo(Math.max(0.001, parseFloat((cantidadNuevo - (unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? 0.1 : 1)).toFixed(3))))} className="w-8 h-8 rounded bg-gray-600 text-white flex items-center justify-center hover:bg-gray-500 transition text-lg">–</button>
                      <input type="number" step={unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? "0.001" : "1"} min="0.001" value={cantidadNuevo} onChange={(e) => { const val = parseFloat(e.target.value); if (!isNaN(val) && val > 0) setCantidadNuevo(val); }} className="flex-1 text-center bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 py-1.5 text-lg font-mono" />
                      <button onClick={() => setCantidadNuevo(parseFloat((cantidadNuevo + (unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? 0.1 : 1)).toFixed(3)))} className="w-8 h-8 rounded bg-gray-600 text-white flex items-center justify-center hover:bg-gray-500 transition text-lg">+</button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-3 border-t border-gray-600">
                  <button onClick={() => { setMostrarAgregar(false); setProductoSeleccionado(''); setCantidadNuevo(1); setPrecioNuevo(0); setActualizarProductoNuevo(false); setBusquedaProducto(''); }} className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded hover:bg-gray-600 transition">Cancelar</button>
                  <button onClick={handleAgregarProducto} disabled={!productoSeleccionado || cantidadNuevo <= 0 || precioNuevo <= 0} className={`px-4 py-2 rounded transition ${productoSeleccionado && cantidadNuevo > 0 && precioNuevo > 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}><FaPlus className="inline mr-1" /> Agregar al pedido</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-medium text-amber-400 mb-3">Productos</h3>
          <div className="space-y-3">
            {pedido.productos.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                <div>
                  <div className="text-white">{p.nombre}</div>
                  <div className="text-sm text-gray-400"><span className="ml-2 capitalize">{p.tipoPrecio}</span></div>
                </div>
                <div className="flex items-center gap-3">
                  {editandoProducto === idx ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setCantidadTemporal(Math.max(0.001, parseFloat((cantidadTemporal - (p.unidad === 'kg' || p.unidad === 'litro' ? 0.1 : 1)).toFixed(3))))} className="w-7 h-7 rounded bg-gray-700 text-white flex items-center justify-center text-sm">–</button>
                        <input type="number" step={p.unidad === 'kg' || p.unidad === 'litro' ? "0.001" : "1"} min="0.001" value={cantidadTemporal} onChange={(e) => { const val = parseFloat(e.target.value); if (!isNaN(val) && val > 0) setCantidadTemporal(val); }} className="w-20 text-center bg-gray-700 text-white rounded border border-gray-600 focus:outline-none py-1 text-sm font-mono" />
                        <button onClick={() => setCantidadTemporal(parseFloat((cantidadTemporal + (p.unidad === 'kg' || p.unidad === 'litro' ? 0.1 : 1)).toFixed(3)))} className="w-7 h-7 rounded bg-gray-700 text-white flex items-center justify-center text-sm">+</button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 text-sm">$</span>
                        <input type="number" step="0.01" min="0.01" value={precioTemporal} onChange={(e) => { const val = parseFloat(e.target.value); if (!isNaN(val) && val > 0) setPrecioTemporal(val); }} className="w-28 text-center bg-gray-700 text-white rounded border border-gray-600 focus:outline-none py-1 text-sm font-mono" />
                      </div>
                      <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={actualizarProductoBase} onChange={(e) => setActualizarProductoBase(e.target.checked)} className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" />
                        <FaSync className="text-blue-400" size={10} /> Actualizar BD
                      </label>
                      <button onClick={() => guardarCantidadYPrecio(idx)} className="text-green-500 hover:text-green-400 text-sm font-medium flex items-center gap-1"><FaCheck size={14} /> Guardar</button>
                      <button onClick={() => setEditandoProducto(null)} className="text-gray-500 hover:text-gray-400 text-sm">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="text-right min-w-[200px]">
                        <div className="text-white font-medium">{formatCantidad(p.cantidad, p.unidad)} {getUnidadTexto(p.cantidad, p.unidad)}</div>
                        <div className="text-xs text-gray-400">{formatARS(p.precioAplicado)} c/u • {formatARS(p.subtotal)} total</div>
                      </div>
                      {['preparacion', 'enviado', 'entregado'].includes(pedido.estado) && (
                        <div className="flex gap-1">
                          <button onClick={() => iniciarEdicion(idx, p.cantidad, p.precioAplicado)} className="text-amber-500 hover:text-amber-400" title="Editar"><FaEdit size={16} /></button>
                          <button onClick={() => eliminarProducto(idx, p.nombre)} className="text-red-500 hover:text-red-400" title="Eliminar"><FaTrash size={16} /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
          <div>
            {pedido.notas && <div className="text-sm text-gray-400 mb-2"><strong>Notas:</strong> {pedido.notas}</div>}
            <div className="text-sm text-gray-500">Creado: {new Date(pedido.createdAt).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-400">Total</div>
            <div className="text-2xl font-bold text-white">{formatARS(pedido.total)}</div>
          </div>
        </div>

        {pedido.estadoPago !== 'pagado' && (
          <div className="mt-6 p-4 bg-gradient-to-r from-emerald-900/30 to-green-900/30 rounded-lg border border-emerald-700/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-sm text-gray-300 mb-1">Hacer el pago del pedido:</div>
                <div className="text-3xl font-bold text-emerald-400">{formatARS(saldoPendiente ?? pedido.total)}</div>
              </div>
              <button
                onClick={handleRegistrarPago}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-lg shadow-emerald-900/30"
              >
                <FaMoneyBillWave /> Registrar Pago
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-750 rounded-lg border border-gray-700">
          <span className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2"><FaDollarSign /> Ingreso de importe al ticket en concepto de: </span>
          <button
            onClick={() => setMostrarImporteManual(!mostrarImporteManual)}
            className="w-full flex items-center justify-between p-3 rounded-lg border bg-blue-900/20 hover:bg-blue-900/30 border-blue-700/50 transition group text-left cursor-pointer mt-2"
          >
            <div className="flex items-center gap-2">
              <FaDollarSign className="text-blue-400" />
              <span className="font-semibold text-sm text-blue-300 group-hover:text-blue-200">
                Agregar Importe
              </span>
            </div>
            <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
              <FaPlus size={10} /> {mostrarImporteManual ? 'Ocultar formulario' : 'Ingresar importe'}
            </span>
          </button>

          {mostrarImporteManual && (
            <div className="p-4 bg-gray-800 rounded-lg border border-blue-900/50 space-y-3 mt-3">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <FaDollarSign />
                <span className="font-semibold text-sm">Ingresar importe</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Descripción del concepto</label>
                <input
                  type="text"
                  value={descImporteManual}
                  onChange={(e) => setDescImporteManual(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej. Cargo adicional, servicio extra"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Importe a agregar ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={montoImporteManual}
                  onChange={(e) => setMontoImporteManual(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Forma de pago *</label>
                <select
                  value={formaPagoImporteManual}
                  onChange={(e) => setFormaPagoImporteManual(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {FORMAS_PAGO.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Si seleccionás "Cuenta Corriente", se descontará del saldo del cliente
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleRegistrarImporteManual}
                  disabled={montoImporteManual <= 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white py-2 rounded text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <FaCheck size={12} /> Agregar al Pedido
                </button>
                <button
                  onClick={() => {
                    setMostrarImporteManual(false);
                    setMontoImporteManual(0);
                    setDescImporteManual('Importe adeudado');
                    setFormaPagoImporteManual('otro');
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded text-sm transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <Link href={`/gestion/pedidos/${pedido._id}/imprimir`} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            <FaPrint /> Imprimir ticket
          </Link>
        </div>
      </div>
    </div>
  );
}