'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import { FaShoppingCart, FaPlus, FaClock, FaWarehouse, FaDollarSign, FaEye } from 'react-icons/fa';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

interface ClientePedido {
  _id: string;
  razonSocial: string;
}

interface ProductoPedido {
  nombre: string;
  cantidad: number;
  tipoPrecio: 'minorista' | 'mayorista';
}

interface Pedido {
  _id: string;
  cliente: ClientePedido;
  productos: ProductoPedido[];
  estado: 'pendiente' | 'preparacion' | 'enviado' | 'entregado' | 'cancelado';
  deposito: string;
  fechaEstimadaEntrega?: string;
  total: number;
  createdAt: string;
}

// Colores por estado
const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-gray-500', text: 'text-gray-200' },
  preparacion: { label: 'En preparación', color: 'bg-amber-600', text: 'text-white' },
  enviado: { label: 'Enviado', color: 'bg-blue-600', text: 'text-white' },
  entregado: { label: 'Entregado', color: 'bg-green-600', text: 'text-white' },
  cancelado: { label: 'Cancelado', color: 'bg-red-600', text: 'text-white' },
};

export default function PedidosPage() {
  const isAuthorized = useAdminAuthorization();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

// Cargar pedidos con actualización automática
useEffect(() => {
  if (!isAuthorized) return;

  // Función para cargar pedidos
  const fetchPedidos = async () => {
    try {
      const res = await fetch('/api/gestion/pedidos', { cache: 'no-store' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error desconocido');
      }
      const data = await res.json();
      setPedidos(data);
    } catch (err: any) {
      console.error('Error al cargar pedidos:', err);
      // 👇 Opcional: no mostrar alerta en cada fallo del polling
      // Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los pedidos.', confirmButtonColor: '#d33' });
    } finally {
      setLoading(false);
    }
  };

  // Cargar inmediatamente
  fetchPedidos();

  // 👇 Repetir cada 12 segundos
  const intervalId = setInterval(fetchPedidos, 12000);

  // Limpiar el intervalo al desmontar
  return () => clearInterval(intervalId);
}, [isAuthorized]);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FaShoppingCart className="text-amber-400" />
            Gestión de Pedidos
          </h1>
          <p className="text-gray-400 mt-1">
            Cargar, seguir y gestionar pedidos desde el inicio hasta la entrega.
          </p>
          <p className="text-gray-400 mt-1">volver a la sección de <a href="/gestion" className="text-amber-400 underline">Gestión</a>.</p>
        </div>
        <Link
          href="/gestion/pedidos/nuevo"
          className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center gap-2"
        >
          <FaPlus />
          Nuevo Pedido
        </Link>
      </div>

      {/* Listado */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-300">Cargando pedidos...</div>
        ) : pedidos.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No hay pedidos registrados.{' '}
            <Link href="/gestion/pedidos/nuevo" className="text-amber-400 hover:underline">
              Crear uno nuevo
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {pedidos.map((pedido) => {
              const estado = ESTADO_CONFIG[pedido.estado] || ESTADO_CONFIG.pendiente;
              const totalProductos = pedido.productos.reduce((sum, p) => sum + p.cantidad, 0);

              return (
                <div key={pedido._id} className="p-4 hover:bg-gray-750 transition">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div>

                           <div className="font-medium text-white">
                            Pedido # {pedido._id.slice(-6).toUpperCase()}
                          </div>
                          
                          <div className="font-medium text-white">
                            {pedido.cliente.razonSocial}
                          </div>
                          <div className="text-sm text-gray-300">
                            {totalProductos} producto(s) • {pedido.deposito}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <FaDollarSign className="text-xs" />
                              ${pedido.total.toFixed(2)}
                            </span>
                            {pedido.fechaEstimadaEntrega && (
                              <span className="ml-3 flex items-center gap-1">
                                <FaClock className="text-xs" />
                                Entrega: {new Date(pedido.fechaEstimadaEntrega).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Estado con color */}
                      <span className={`px-2 py-1 text-xs rounded-full ${estado.color} ${estado.text}`}>
                        {estado.label}
                      </span>

                      {/* Botón ver detalle */}
                      <Link
                        href={`/gestion/pedidos/${pedido._id}`}
                        className="text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center gap-1"
                      >
                        <FaEye />
                        Ver
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}