'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import { FaShoppingCart, FaUser, FaWarehouse, FaClock, FaDollarSign, FaArrowLeft } from 'react-icons/fa';
import Swal from 'sweetalert2';

// Tipos
interface Cliente {
  _id: string;
  razonSocial: string;
  nombre: string;
  apellido: string;
  direccion?: string;
  telefono?: string;
}

interface Producto {
  nombre: string;
  unidad: string;
  cantidad: number;
  tipoPrecio: 'minorista' | 'mayorista';
  precioAplicado: number;
  subtotal: number;
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

const ESTADO_OPCIONES = [
  'pendiente',
  'preparacion',
  'enviado',
  'entregado',
  'cancelado'
] as const;

export default function DetallePedidoPage() {
  const isAuthorized = useAdminAuthorization();
  const { id } = useParams() as { id?: string };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<Pedido | null>(null);

  // Cargar pedido
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

  // Cambiar estado
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
          setPedido(prev => prev ? { ...prev, estado: nuevoEstado as any } : null);
        } else {
          const error = await res.json();
          Swal.fire('Error', error.error || 'No se pudo actualizar el estado', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión con el servidor', 'error');
      }
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
        {/* Información general */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-750 p-4 rounded-lg">
            <h3 className="font-medium text-amber-400 mb-2 flex items-center gap-2">
              <FaUser />
              Cliente
            </h3>
            <p className="text-white">{pedido.cliente.razonSocial}</p>
            <p className="text-gray-300 text-sm">
              {pedido.cliente.nombre} {pedido.cliente.apellido}  <br />
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

        {/* Estado */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Estado actual
          </label>
          <div className="flex flex-wrap gap-2">
            {ESTADO_OPCIONES.map(estado => (
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

        {/* Productos */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-amber-400 mb-3">Productos</h3>
          <div className="space-y-3">
            {pedido.productos.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                <div>
                  <div className="text-white">{p.nombre}</div>
                  <div className="text-sm text-gray-400">
                    {p.cantidad} {p.unidad} • 
                    <span className="ml-2 capitalize">{p.tipoPrecio}</span> (${p.precioAplicado.toFixed(2)})
                  </div>
                </div>
                <div className="text-white font-medium">
                  ${p.subtotal.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
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
      </div>
    </div>
  );
}