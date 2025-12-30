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
} from 'react-icons/fa';
import Swal from 'sweetalert2';

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
  unidad: string;
  cantidad: number;
  tipoPrecio: 'minorista' | 'mayorista';
  precioAplicado: number;
  subtotal: number;
}

interface ProductoSimple {
  _id: string;
  nombre: string;
  unidad: string;
  precio: { minorista: number; mayorista: number };
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

export default function DetallePedidoPage() {
  const isAuthorized = useAdminAuthorization();
  const { id } = useParams() as { id?: string };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [saldo, setSaldo] = useState<{ saldoPendiente: number; pagos: any[] } | null>(null);
  const [editandoProducto, setEditandoProducto] = useState<number | null>(null);
  const [cantidadTemporal, setCantidadTemporal] = useState<number>(1);
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoSimple[]>([]);
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [cantidadNuevo, setCantidadNuevo] = useState<number>(1);

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

  const iniciarEdicion = (idx: number, cantidad: number) => {
    setEditandoProducto(idx);
    setCantidadTemporal(cantidad);
  };

  const guardarCantidad = async (idx: number) => {
    if (cantidadTemporal <= 0) {
      Swal.fire('Error', 'La cantidad debe ser mayor a 0', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/gestion/pedidos/${id}/producto/${idx}/cantidad`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevaCantidad: cantidadTemporal }),
      });

      if (res.ok) {
        const updatedPedido = await res.json();
        setPedido(updatedPedido);
        await fetchSaldo();
        setEditandoProducto(null);
        Swal.fire('¡Actualizado!', 'La cantidad fue modificada.', 'success');
      } else {
        const error = await res.json();
        Swal.fire('Error', error.error || 'No se pudo actualizar la cantidad', 'error');
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
  const handleAgregarProducto = async () => {
    if (!productoSeleccionado || cantidadNuevo <= 0) {
      Swal.fire('Error', 'Selecciona un producto y una cantidad válida', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/gestion/pedidos/${id}/producto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId: productoSeleccionado, cantidad: cantidadNuevo }),
      });

      if (res.ok) {
        const updatedPedido = await res.json();
        setPedido(updatedPedido);
        await fetchSaldo();
        setMostrarAgregar(false);
        setProductoSeleccionado('');
        setCantidadNuevo(1);
        Swal.fire('¡Agregado!', 'El producto fue añadido al pedido.', 'success');
      } else {
        const error = await res.json();
        Swal.fire('Error', error.error || 'No se pudo agregar el producto', 'error');
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
                className={`px-3 py-1 text-xs rounded-full ${
                  pedido.estado === estado
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
        {['pendiente', 'preparacion'].includes(pedido.estado) && (
          <div className="mb-4">
            <button
              onClick={() => setMostrarAgregar(!mostrarAgregar)}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm"
            >
              <FaPlus size={12} />
              Agregar producto al pedido
            </button>

            {mostrarAgregar && (
              <div className="mt-3 p-3 bg-gray-750 rounded flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <select
                  value={productoSeleccionado}
                  onChange={(e) => setProductoSeleccionado(e.target.value)}
                  className="bg-gray-700 text-white rounded px-2 py-1 border border-gray-600"
                >
                  <option value="">Seleccionar producto</option>
                  {productosDisponibles.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.nombre} ({p.unidad})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-gray-300 text-sm">Cantidad:</label>
                  <input
                    type="number"
                    min="1"
                    value={cantidadNuevo}
                    onChange={(e) => setCantidadNuevo(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
                <button
                  onClick={handleAgregarProducto}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm"
                >
                  Agregar
                </button>
                <button
                  onClick={() => {
                    setMostrarAgregar(false);
                    setProductoSeleccionado('');
                    setCantidadNuevo(1);
                  }}
                  className="text-gray-400 hover:text-gray-300 text-sm"
                >
                  Cancelar
                </button>
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
                    <span className="ml-2 capitalize">{p.tipoPrecio}</span> (${p.precioAplicado.toFixed(2)})
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {editandoProducto === idx ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCantidadTemporal(Math.max(1, cantidadTemporal - 1))}
                        className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center"
                      >
                        –
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={cantidadTemporal}
                        onChange={(e) => setCantidadTemporal(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 text-center bg-gray-700 text-white rounded border border-gray-600"
                      />
                      <button
                        onClick={() => setCantidadTemporal(cantidadTemporal + 1)}
                        className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        onClick={() => guardarCantidad(idx)}
                        className="text-green-500 hover:text-green-400 text-sm"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditandoProducto(null)}
                        className="text-gray-500 hover:text-gray-400 text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-white">
                        {p.cantidad} {p.unidad}
                      </span>
                      <div className="text-white font-medium">${p.subtotal.toFixed(2)}</div>

                      {['pendiente', 'preparacion', 'enviado'].includes(pedido.estado) && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => iniciarEdicion(idx, p.cantidad)}
                            className="text-amber-500 hover:text-amber-400"
                            title="Editar cantidad"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => eliminarProducto(idx, p.nombre)}
                            className="text-red-500 hover:text-red-400"
                            title="Eliminar producto"
                          >
                            <FaTrash size={14} />
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
            <div className="text-2xl font-bold text-white">${pedido.total.toFixed(2)}</div>
          </div>
        </div>

        {saldo && (
          <div className="mt-4 p-3 bg-gray-750 rounded">
            <div className="text-sm text-gray-300">Saldo pendiente:</div>
            <div className="text-xl font-bold text-amber-400">
              ${saldo.saldoPendiente.toFixed(2)}
            </div>

            {saldo.pagos.length > 0 && (
              <div className="mt-3 text-sm">
                <div className="font-medium text-gray-300">Pagos realizados:</div>
                {saldo.pagos.map((p) => (
                  <div key={p._id} className="flex justify-between mt-1">
                    <span>{new Date(p.fechaPago).toLocaleDateString()} • {p.formaPago}</span>
                    <span>${p.monto.toFixed(2)}</span>
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

        <Link
          href={`/gestion/pedidos/${pedido._id}/imprimir`}
          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-2"
        >
          <FaPrint /> Imprimir ticket
        </Link>
      </div>
    </div>
  );
}