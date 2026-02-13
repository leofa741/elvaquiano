// src/app/gestion/pedidos/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import {
  FaUser,
  FaWarehouse,
  FaClock,
  FaArrowLeft,
  FaPrint,
  FaEdit,
  FaTrash,
  FaPlus,
  FaFileInvoice,
  FaSearch,
  FaTimes,
  FaWeightHanging,
  FaDollarSign,
  FaCheck,
  FaSync,
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import { formatARS } from '@/app/lib/formatcurrenci';

// Tipos
interface Cliente {
  _id: string;
  razonSocial: string;
  nombre: string;
  apellido: string;
  direccion?: string;
  telefono?: string;
  tipoCliente?: 'minorista' | 'mayorista';
}

interface Producto {
  _id: string;
  nombre: string;
  unidad: string; // 'kg', 'litro', 'unidad', etc.
  cantidad: number; // ✅ Ahora acepta decimales
  tipoPrecio: 'mayorista' | 'oferta';
  precioAplicado: number;
  subtotal: number;
  producto: string; // ID del producto
}

interface ProductoSimple {
  _id: string;
  nombre: string;
  unidad: string;
  precio: { mayorista: number; oferta: number; };
}

interface Pedido {
  _id: string;
  cliente: Cliente;
  productos: Producto[];
  estado: 'pendiente' | 'preparacion' | 'enviado' | 'entregado' | 'cancelado';
  deposito: string;
  fechaEstimadaEntrega?: string;
  notas?: string;
  total: number;
  createdAt: string;
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  preparacion: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ESTADO_OPCIONES = ['pendiente', 'preparacion', 'enviado', 'entregado', 'cancelado'] as const;

// ✅ Formatear cantidad según la unidad
const formatCantidad = (cantidad: number, unidad: string): string => {
  if (unidad === 'kg' || unidad === 'litro') {
    // Para kg y litros: mostrar 3 decimales (gramos/mililitros)
    return cantidad.toFixed(3).replace('.', ',');
  }
  // Para unidades enteras: redondear
  return Math.round(cantidad).toString();
};

// ✅ Obtener texto de unidad según cantidad y tipo
const getUnidadTexto = (cantidad: number, unidad: string): string => {
  if (unidad === 'kg') {
    return 'kg';
  } else if (unidad === 'litro') {
    return cantidad === 1 ? 'litro' : 'litros';
  } else if (unidad === 'unidad') {
    return cantidad === 1 ? 'unidad' : 'unidades';
  } else {
    // caja, pack, etc.
    return unidad;
  }
};

export default function DetallePedidoPage() {
  const isAuthorized = useAdminAuthorization();
  const { id } = useParams() as { id?: string };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [saldo, setSaldo] = useState<{ saldoPendiente: number; pagos: any[] } | null>(null);
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

  // Fetch saldo
  const fetchSaldo = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/gestion/pedidos/${id}/saldo`);
      if (res.ok) {
        const data = await res.json();
        setSaldo(data);
      }
    } catch (err) {
      console.error('Error al cargar saldo:', err);
    }
  };

  // Fetch productos simples
  const fetchProductos = async () => {
    const res = await fetch('/api/gestion/productos/lista-simple');
    const data = await res.json();
    setProductosDisponibles(data);
  };

  useEffect(() => {
    fetchSaldo();
    fetchProductos();
  }, [id]);

  useEffect(() => {
    if (!isAuthorized || !id) return;

    const fetchPedido = async () => {
      try {
        const res = await fetch(`/api/gestion/pedidos/${id}`);
        if (!res.ok) throw new Error('Pedido no encontrado');
        const data = await res.json();
        setPedido(data);
      } catch (err: any) {
        Swal.fire('Error', err.message || 'No se pudo cargar el pedido', 'error');
        router.push('/gestion/pedidos');
      } finally {
        setLoading(false);
      }
    };

    fetchPedido();
  }, [isAuthorized, id, router]);

  if (!isAuthorized) return null;
  if (loading) return <div className="p-8 text-center text-gray-400">Cargando pedido...</div>;
  if (!pedido) return null;

  // ✅ Filtrar productos según la búsqueda
  const productosFiltrados = productosDisponibles.filter(p => 
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase().trim())
  );

  // ✅ Obtener unidad del producto seleccionado para ajustar el step
  const unidadSeleccionada = productoSeleccionado 
    ? productosDisponibles.find(p => p._id === productoSeleccionado)?.unidad 
    : null;
  
  const stepCantidad = unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? 0.1 : 1;

  // ✅ Obtener precio del producto seleccionado
  const productoSeleccionadoData = productoSeleccionado 
    ? productosDisponibles.find(p => p._id === productoSeleccionado)
    : null;
  
  const precioSugerido = productoSeleccionadoData 
    ? (productoSeleccionadoData.precio.oferta && productoSeleccionadoData.precio.oferta < productoSeleccionadoData.precio.mayorista 
        ? productoSeleccionadoData.precio.oferta 
        : productoSeleccionadoData.precio.mayorista)
    : 0;

  const handleCambiarEstado = async (nuevoEstado: string) => {
    const result = await Swal.fire({
      title: '¿Cambiar estado?',
      text: `¿Seguro que deseas cambiar el estado a "${ESTADO_LABEL[nuevoEstado]}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, actualizar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/gestion/pedidos/${id}/estado`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: nuevoEstado }),
        });

        if (res.ok) {
          Swal.fire('¡Actualizado!', 'El estado del pedido ha sido actualizado.', 'success');
          setPedido((prev) => (prev ? { ...prev, estado: nuevoEstado as any } : null));
        } else {
          const error = await res.json();
          Swal.fire('Error', error.error || 'No se pudo actualizar el estado', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión con el servidor', 'error');
      }
    }
  };

  const iniciarEdicion = (idx: number, cantidad: number, precio: number) => {
    setEditandoProducto(idx);
    setCantidadTemporal(cantidad);
    setPrecioTemporal(precio);
    setActualizarProductoBase(false);
  };

  const guardarCantidadYPrecio = async (idx: number) => {
    if (cantidadTemporal <= 0 || isNaN(cantidadTemporal)) {
      Swal.fire('Error', 'La cantidad debe ser mayor a 0', 'error');
      return;
    }

    if (precioTemporal <= 0 || isNaN(precioTemporal)) {
      Swal.fire('Error', 'El precio debe ser mayor a 0', 'error');
      return;
    }

    // ✅ Validación: máximo 3 decimales para evitar errores de precisión
    const cantidadValidada = parseFloat(cantidadTemporal.toFixed(3));

    try {
      const res = await fetch(`/api/gestion/pedidos/${id}/producto/${idx}/cantidad`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nuevaCantidad: cantidadValidada,
          nuevoPrecio: precioTemporal,
          actualizarProducto: actualizarProductoBase
        }),
      });

      if (res.ok) {
        const updatedPedido = await res.json();
        setPedido(updatedPedido);
        await fetchSaldo();
        setEditandoProducto(null);
        Swal.fire({
          icon: 'success',
          title: '¡Actualizado!',
          html: actualizarProductoBase 
            ? 'Cantidad, precio y producto en base de datos actualizados.'
            : 'Cantidad y precio actualizados.',
          timer: 3000
        });
      } else {
        const error = await res.json();
        Swal.fire('Error', error.error || 'No se pudo actualizar', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión', 'error');
    }
  };

  const eliminarProducto = async (idx: number, nombre: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar producto?',
      text: `¿Seguro que deseas eliminar "${nombre}" del pedido?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/gestion/pedidos/${id}/producto/${idx}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          const updatedPedido = await res.json();
          setPedido(updatedPedido);
          await fetchSaldo();
          Swal.fire('¡Eliminado!', 'El producto fue removido del pedido.', 'success');
        } else {
          const error = await res.json();
          Swal.fire('Error', error.error || 'No se pudo eliminar el producto', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión', 'error');
      }
    }
  };

  // ✅ Agregar nuevo producto
 // src/app/gestion/pedidos/[id]/page.tsx

// ✅ Agregar nuevo producto (con lógica de reemplazo si ya existe)
const handleAgregarProducto = async () => {
  if (!productoSeleccionado || cantidadNuevo <= 0 || isNaN(cantidadNuevo)) {
    Swal.fire('Error', 'Selecciona un producto y una cantidad válida', 'error');
    return;
  }

  if (precioNuevo <= 0 || isNaN(precioNuevo)) {
    Swal.fire('Error', 'El precio debe ser mayor a 0', 'error');
    return;
  }

  // ✅ Validación: máximo 3 decimales
  const cantidadValidada = parseFloat(cantidadNuevo.toFixed(3));

  try {
    // ✅ Verificar si el producto ya existe en el pedido
    const productoExistente = pedido?.productos.findIndex(
      p => p.producto === productoSeleccionado
    );

    if (productoExistente !== -1) {
      // ✅ El producto ya existe, preguntar si reemplazar o sumar
      const { value: accion } = await Swal.fire({
        title: 'Producto ya existe',
        html: `El producto ya está en el pedido.<br><br>
               <strong>Opciones:</strong><br>
               • <strong>Reemplazar:</strong> Actualizar cantidad y precio<br>
               • <strong>Sumar:</strong> Agregar a la cantidad existente<br>
               • <strong>Cancelar:</strong> No hacer nada`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Reemplazar',
        cancelButtonText: 'Cancelar',
        showDenyButton: true,
        denyButtonColor: '#8b5cf6',
        denyButtonText: 'Sumar',
        reverseButtons: true,
      });

      if (accion === null) {
        // Cancelar
        return;
      }

      if (accion === true) {
        // ✅ Reemplazar: Actualizar cantidad y precio existente
        const res = await fetch(`/api/gestion/pedidos/${id}/producto/${productoExistente}/cantidad`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            nuevaCantidad: cantidadValidada,
            nuevoPrecio: precioNuevo,
            actualizarProducto: actualizarProductoNuevo
          }),
        });

        if (res.ok) {
          const updatedPedido = await res.json();
          setPedido(updatedPedido);
          await fetchSaldo();
          setMostrarAgregar(false);
          setProductoSeleccionado('');
          setCantidadNuevo(1);
          setPrecioNuevo(0);
          setActualizarProductoNuevo(false);
          setBusquedaProducto('');
          Swal.fire({
            icon: 'success',
            title: '¡Actualizado!',
            html: actualizarProductoNuevo 
              ? 'Producto reemplazado y actualizado en base de datos.'
              : 'Producto reemplazado con nuevos valores.',
            timer: 3000
          });
        } else {
          const error = await res.json();
          Swal.fire('Error', error.error || 'No se pudo actualizar el producto', 'error');
        }
      } else if (accion === false) {
        // ✅ Sumar: Aumentar la cantidad existente
        const productoActual = pedido.productos[productoExistente];
        const nuevaCantidadTotal = productoActual.cantidad + cantidadValidada;
        
        const res = await fetch(`/api/gestion/pedidos/${id}/producto/${productoExistente}/cantidad`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            nuevaCantidad: nuevaCantidadTotal,
            // Mantener el precio existente
            actualizarProducto: actualizarProductoNuevo
          }),
        });

        if (res.ok) {
          const updatedPedido = await res.json();
          setPedido(updatedPedido);
          await fetchSaldo();
          setMostrarAgregar(false);
          setProductoSeleccionado('');
          setCantidadNuevo(1);
          setPrecioNuevo(0);
          setActualizarProductoNuevo(false);
          setBusquedaProducto('');
          Swal.fire({
            icon: 'success',
            title: '¡Sumado!',
            html: `Cantidad actualizada a ${formatCantidad(nuevaCantidadTotal, productoActual.unidad)} ${getUnidadTexto(nuevaCantidadTotal, productoActual.unidad)}`,
            timer: 3000
          });
        } else {
          const error = await res.json();
          Swal.fire('Error', error.error || 'No se pudo actualizar la cantidad', 'error');
        }
      }
    } else {
      // ✅ El producto no existe, agregar nuevo
      const res = await fetch(`/api/gestion/pedidos/${id}/producto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productoId: productoSeleccionado, 
          cantidad: cantidadValidada,
          precioPersonalizado: precioNuevo,
          actualizarProducto: actualizarProductoNuevo
        }),
      });

      if (res.ok) {
        const updatedPedido = await res.json();
        setPedido(updatedPedido);
        await fetchSaldo();
        setMostrarAgregar(false);
        setProductoSeleccionado('');
        setCantidadNuevo(1);
        setPrecioNuevo(0);
        setActualizarProductoNuevo(false);
        setBusquedaProducto('');
        Swal.fire({
          icon: 'success',
          title: '¡Agregado!',
          html: actualizarProductoNuevo 
            ? 'Producto agregado con precio personalizado y actualizado en base de datos.'
            : 'Producto agregado con precio personalizado.',
          timer: 3000
        });
      } else {
        const error = await res.json();
        Swal.fire('Error', error.error || 'No se pudo agregar el producto', 'error');
      }
    }
  } catch (err) {
    Swal.fire('Error', 'Error de conexión', 'error');
  }
};

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/gestion/pedidos" className="text-amber-500 hover:text-amber-400 flex items-center gap-1">
          <FaArrowLeft />
          Volver a pedidos
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Pedido #{pedido._id.slice(-6).toUpperCase()}</h1>
        <Link href="/gestion/dashboard" className="text-amber-500 hover:text-amber-400 flex items-center gap-1">
          <FaWarehouse />
          Ir al dashboard de Cuentas Corrientes
        </Link>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-750 p-4 rounded-lg">
            <h3 className="font-medium text-amber-400 mb-2 flex items-center gap-2">
              <FaUser />
              Cliente
            </h3>
            <p className="text-white">{pedido.cliente.razonSocial}</p>
            <p className="text-gray-300 text-sm">
              {pedido.cliente.nombre} {pedido.cliente.apellido} <br />
              {pedido.cliente.direccion} <br />
              {pedido.cliente.telefono}
            </p>
          </div>

          <div className="bg-gray-750 p-4 rounded-lg">
            <h3 className="font-medium text-amber-400 mb-2 flex items-center gap-2">
              <FaWarehouse />
              Depósito y entrega
            </h3>
            <p className="text-white">Depósito: {pedido.deposito}</p>
            {pedido.fechaEstimadaEntrega && (
              <p className="text-gray-300 text-sm">
                <FaClock className="inline mr-1 text-xs" />
                Entrega estimada: {new Date(pedido.fechaEstimadaEntrega).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Estado actual</label>
          <div className="flex flex-wrap gap-2">
            {ESTADO_OPCIONES.map((estado) => (
              <button
                key={estado}
                onClick={() => handleCambiarEstado(estado)}
                className={`px-3 py-1 text-xs rounded-full ${pedido.estado === estado
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                {ESTADO_LABEL[estado]}
              </button>
            ))}
          </div>
        </div>

        {/* Botón para agregar producto */}
        {['preparacion', 'enviado', 'entregado'].includes(pedido.estado) && (
          <div className="mb-4">
            <button
              onClick={() => setMostrarAgregar(!mostrarAgregar)}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm"
            >
              <FaPlus size={12} />
              Agregar producto al pedido
            </button>

            {mostrarAgregar && (
              <div className="mt-3 p-4 bg-gray-750 rounded-lg border border-gray-600">
                {/* ✅ Buscador de productos */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Buscar producto
                  </label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={busquedaProducto}
                      onChange={(e) => setBusquedaProducto(e.target.value)}
                      placeholder="Escribe para buscar... (ej: arroz, leche, queso, paleta)"
                      className="w-full pl-10 pr-10 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      autoFocus
                    />
                    {busquedaProducto && (
                      <button
                        onClick={() => setBusquedaProducto('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        title="Limpiar búsqueda"
                      >
                        <FaTimes size={16} />
                      </button>
                    )}
                  </div>
                  {busquedaProducto && productosFiltrados.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      No se encontraron productos con "{busquedaProducto}"
                    </p>
                  )}
                  {busquedaProducto && productosFiltrados.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {productosFiltrados.length} {productosFiltrados.length === 1 ? 'resultado' : 'resultados'} encontrado{productosFiltrados.length === 1 ? '' : 's'}
                    </p>
                  )}
                </div>

                {/* ✅ Select de productos filtrados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Producto
                    </label>
                    <select
                      value={productoSeleccionado}
                      onChange={(e) => {
                        setProductoSeleccionado(e.target.value);
                        // Resetear cantidad y precio al cambiar de producto
                        const prod = productosDisponibles.find(p => p._id === e.target.value);
                        if (prod) {
                          if (prod.unidad === 'kg' || prod.unidad === 'litro') {
                            setCantidadNuevo(0.000);
                          } else {
                            setCantidadNuevo(1);
                          }
                          // Establecer precio sugerido
                          const precioSugerido = prod.precio.oferta && prod.precio.oferta < prod.precio.mayorista 
                            ? prod.precio.oferta 
                            : prod.precio.mayorista;
                          setPrecioNuevo(precioSugerido);
                        }
                      }}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      size={Math.min(5, productosFiltrados.length)}
                    >
                      <option value="">Seleccionar producto...</option>
                      {productosFiltrados.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.nombre} ({p.unidad}) - {formatARS(p.precio.oferta && p.precio.oferta < p.precio.mayorista ? p.precio.oferta : p.precio.mayorista)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                      <FaWeightHanging className="text-amber-400" />
                      Cantidad ({unidadSeleccionada || 'unidad'})
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const nuevaCantidad = Math.max(0.001, parseFloat((cantidadNuevo - (unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? 0.1 : 1)).toFixed(3)));
                          setCantidadNuevo(nuevaCantidad);
                        }}
                        className="w-8 h-8 rounded bg-gray-600 text-white flex items-center justify-center hover:bg-gray-500 transition text-lg"
                        title={unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? 'Restar 100g' : 'Restar 1 unidad'}
                      >
                        –
                      </button>
                      <input
                        type="number"
                        step={unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? "0.001" : "1"}
                        min="0.001"
                        value={cantidadNuevo}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value > 0) {
                            setCantidadNuevo(value);
                          }
                        }}
                        className="flex-1 text-center bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 py-1.5 text-lg font-mono"
                        placeholder={unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? "0,000" : "1"}
                      />
                      <button
                        onClick={() => {
                          const nuevaCantidad = parseFloat((cantidadNuevo + (unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? 0.1 : 1)).toFixed(3));
                          setCantidadNuevo(nuevaCantidad);
                        }}
                        className="w-8 h-8 rounded bg-gray-600 text-white flex items-center justify-center hover:bg-gray-500 transition text-lg"
                        title={unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? 'Sumar 100g' : 'Sumar 1 unidad'}
                      >
                        +
                      </button>
                    </div>
                    {unidadSeleccionada === 'kg' && (
                      <p className="text-xs text-gray-400 mt-1 italic">
                        💡 Ej: 1,300 = 1 kg 300 gramos | 0,750 = 750 gramos
                      </p>
                    )}
                  </div>
                </div>

                {/* ✅ Campo de precio personalizado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                      <FaDollarSign className="text-amber-400" />
                      Precio unitario
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={precioNuevo}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value > 0) {
                            setPrecioNuevo(value);
                          }
                        }}
                        className="w-full pl-8 pr-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg"
                        placeholder="Precio"
                      />
                    </div>
                    {productoSeleccionadoData && (
                      <p className="text-xs text-gray-400 mt-1">
                        Precio sugerido: {formatARS(precioSugerido)} ({productoSeleccionadoData.precio.oferta && productoSeleccionadoData.precio.oferta < productoSeleccionadoData.precio.mayorista ? 'oferta' : 'mayorista'})
                      </p>
                    )}
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={actualizarProductoNuevo}
                        onChange={(e) => setActualizarProductoNuevo(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300 group-hover:text-white transition">
                        <FaSync className="inline mr-1 text-blue-400" />
                        Actualizar producto en base de datos
                      </span>
                    </label>
                  </div>
                </div>

                {/* ✅ Botones de acción */}
                <div className="flex gap-2 justify-end pt-3 border-t border-gray-600">
                  <button
                    onClick={() => {
                      setMostrarAgregar(false);
                      setProductoSeleccionado('');
                      setCantidadNuevo(1);
                      setPrecioNuevo(0);
                      setActualizarProductoNuevo(false);
                      setBusquedaProducto('');
                    }}
                    className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded hover:bg-gray-600 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAgregarProducto}
                    disabled={!productoSeleccionado || cantidadNuevo <= 0 || precioNuevo <= 0 || isNaN(cantidadNuevo) || isNaN(precioNuevo)}
                    className={`px-4 py-2 rounded transition ${
                      productoSeleccionado && cantidadNuevo > 0 && precioNuevo > 0 && !isNaN(cantidadNuevo) && !isNaN(precioNuevo)
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <FaPlus className="inline mr-1" /> Agregar al pedido
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Productos */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-amber-400 mb-3">Productos</h3>
          <div className="space-y-3">
            {pedido.productos.map((p, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0"
              >
                <div>
                  <div className="text-white">{p.nombre}</div>
                  <div className="text-sm text-gray-400">
                    <span className="ml-2 capitalize">{p.tipoPrecio}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {editandoProducto === idx ? (
                    <div className="flex items-center gap-2">
                      {/* ✅ Edición de cantidad */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const nuevaCantidad = Math.max(0.001, parseFloat((cantidadTemporal - (p.unidad === 'kg' || p.unidad === 'litro' ? 0.1 : 1)).toFixed(3)));
                            setCantidadTemporal(nuevaCantidad);
                          }}
                          className="w-7 h-7 rounded bg-gray-700 text-white flex items-center justify-center text-sm"
                          title={p.unidad === 'kg' || p.unidad === 'litro' ? 'Restar 100g' : 'Restar 1 unidad'}
                        >
                          –
                        </button>
                        <input
                          type="number"
                          step={p.unidad === 'kg' || p.unidad === 'litro' ? "0.001" : "1"}
                          min="0.001"
                          value={cantidadTemporal}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value > 0) {
                              setCantidadTemporal(value);
                            }
                          }}
                          className="w-20 text-center bg-gray-700 text-white rounded border border-gray-600 focus:outline-none py-1 text-sm font-mono"
                        />
                        <button
                          onClick={() => {
                            const nuevaCantidad = parseFloat((cantidadTemporal + (p.unidad === 'kg' || p.unidad === 'litro' ? 0.1 : 1)).toFixed(3));
                            setCantidadTemporal(nuevaCantidad);
                          }}
                          className="w-7 h-7 rounded bg-gray-700 text-white flex items-center justify-center text-sm"
                          title={p.unidad === 'kg' || p.unidad === 'litro' ? 'Sumar 100g' : 'Sumar 1 unidad'}
                        >
                          +
                        </button>
                      </div>

                      {/* ✅ Edición de precio */}
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={precioTemporal}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value > 0) {
                              setPrecioTemporal(value);
                            }
                          }}
                          className="w-28 text-center bg-gray-700 text-white rounded border border-gray-600 focus:outline-none py-1 text-sm font-mono"
                        />
                      </div>

                      {/* ✅ Checkbox para actualizar producto en base */}
                      <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer hover:text-white">
                        <input
                          type="checkbox"
                          checked={actualizarProductoBase}
                          onChange={(e) => setActualizarProductoBase(e.target.checked)}
                          className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <FaSync className="text-blue-400" size={10} />
                        Actualizar BD
                      </label>

                      {/* ✅ Botones de acción */}
                      <button
                        onClick={() => guardarCantidadYPrecio(idx)}
                        className="text-green-500 hover:text-green-400 text-sm font-medium flex items-center gap-1"
                        title="Guardar cambios"
                      >
                        <FaCheck size={14} /> Guardar
                      </button>
                      <button
                        onClick={() => setEditandoProducto(null)}
                        className="text-gray-500 hover:text-gray-400 text-sm"
                        title="Cancelar"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="text-right min-w-[200px]">
                        {/* ✅ Formato inteligente según unidad */}
                        <div className="text-white font-medium">
                          {formatCantidad(p.cantidad, p.unidad)} {getUnidadTexto(p.cantidad, p.unidad)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatARS(p.precioAplicado)} c/u • {formatARS(p.subtotal)} total
                        </div>
                      </div>

                      {['preparacion', 'enviado', 'entregado'].includes(pedido.estado) && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => iniciarEdicion(idx, p.cantidad, p.precioAplicado)}
                            className="text-amber-500 hover:text-amber-400"
                            title="Editar cantidad y precio"
                          >
                            <FaEdit size={16} />
                          </button>
                          <button
                            onClick={() => eliminarProducto(idx, p.nombre)}
                            className="text-red-500 hover:text-red-400"
                            title="Eliminar producto"
                          >
                            <FaTrash size={16} />
                          </button>
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
            {pedido.notas && (
              <div className="text-sm text-gray-400 mb-2">
                <strong>Notas:</strong> {pedido.notas}
              </div>
            )}
            <div className="text-sm text-gray-500">
              Creado: {new Date(pedido.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-400">Total</div>
            <div className="text-2xl font-bold text-white">
              {formatARS(pedido.total)}
            </div>
          </div>
        </div>

        {saldo && (
          <div className="mt-4 p-3 bg-gray-750 rounded">
            <div className="text-sm text-gray-300">Saldo pendiente:</div>
            <div className="text-xl font-bold text-amber-400">
              {formatARS(saldo.saldoPendiente)}
            </div>

            {saldo.pagos.length > 0 && (
              <div className="mt-3 text-sm">
                <div className="font-medium text-gray-300">Pagos realizados:</div>
                {saldo.pagos.map((p) => (
                  <div key={p._id} className="flex justify-between mt-1">
                    <span>{new Date(p.fechaPago).toLocaleDateString()} • {p.formaPago}</span>
                    <span>${formatARS(p.monto)}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => router.push(`/gestion/pedidos/${id}/pagos/nuevo`)}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
            >
              Registrar pago
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-4">
          <Link
            href={`/gestion/pedidos/${pedido._id}/imprimir`}
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <FaPrint /> Imprimir ticket
          </Link>

          {/* ✅ Botón para regenerar presupuesto */}
          <button
            onClick={async () => {
              const result = await Swal.fire({
                title: '¿Regenerar presupuesto actualizado?',
                text: 'Se creará un nuevo presupuesto con los productos actuales de este pedido, incluyendo cambios recientes.',
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Sí, regenerar',
                cancelButtonText: 'Cancelar',
              });

              if (result.isConfirmed) {
                try {
                  const res = await fetch(`/api/gestion/pedidos/${id}/regenerar-presupuesto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  });

                  if (res.ok) {
                    const data = await res.json();
                    Swal.fire('¡Éxito!', 'Presupuesto regenerado con éxito.', 'success');
                    router.push(`/gestion/presupuestos/imprimir/${data._id}`);
                  } else {
                    const error = await res.json();
                    Swal.fire('Error', error.error || 'No se pudo regenerar el presupuesto', 'error');
                  }
                } catch (err) {
                  console.error('Error:', err);
                  Swal.fire('Error', 'Error de conexión con el servidor', 'error');
                }
              }
            }}
            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <FaFileInvoice /> Regenerar presupuesto actualizado
          </button>
        </div>
      </div>
    </div>
  );
}