// app/gestion/pedidos/nuevo/page.tsx
'use client';
export const dynamic = 'force-dynamic'; // evita prerender y errores de useSearchParams

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import { FaShoppingCart, FaUser } from 'react-icons/fa';
import Swal from 'sweetalert2';
import ProductoLinea from './components/ProductoLinea';

// Tipos
interface ClienteOption {
  _id: string;
  razonSocial: string;
  nombre: string;
  apellido: string;
  condiciones?: { diasHabiles: number };
}

interface ProductoOption {
  _id: string;
  nombre: string;
  unidad: string;
  precioMinorista: number;
  precioMayorista: number;
  stock: Array<{ deposito: string; cantidad: number }>;
}

interface ProductoEnPedido {
  producto: ProductoOption;
  deposito: string;
  cantidad: number;
  tipoPrecio: 'minorista' | 'mayorista';
}

export default function NuevoPedidoPage() {
  const isAuthorized = useAdminAuthorization();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteIdFromUrl = searchParams.get('clienteId');

  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [clienteId, setClienteId] = useState<string>('');
  const [deposito, setDeposito] = useState<string>('');
  const [fechaEstimada, setFechaEstimada] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [productosEnPedido, setProductosEnPedido] = useState<ProductoEnPedido[]>([]);

  // Cargar datos
  useEffect(() => {
    if (!isAuthorized) return;

    const loadData = async () => {
      try {
        const [resClientes, resProductos] = await Promise.all([
          fetch('/api/gestion/clientes'),
          fetch('/api/gestion/productos')
        ]);

        const dataClientes = await resClientes.json();
        const dataProductos = await resProductos.json();

        setClientes(dataClientes.filter((c: any) => c.activo));

        setProductos(
          dataProductos.products?.filter((p: any) =>
            p.stock?.some((s: any) => s.cantidad > 0)
          ) || []
        );
      } catch (err) {
        Swal.fire('Error', 'No se pudieron cargar clientes o productos', 'error');
      }
    };

    loadData();
  }, [isAuthorized]);

  // Preseleccionar cliente desde URL
  useEffect(() => {
    if (clienteIdFromUrl && clientes.length > 0) {
      const clienteExiste = clientes.some(c => c._id === clienteIdFromUrl);
      if (clienteExiste) setClienteId(clienteIdFromUrl);
    }
  }, [clienteIdFromUrl, clientes]);

  // Actualizar fecha estimada según cliente
  useEffect(() => {
    if (!clienteId) {
      setDeposito('');
      setFechaEstimada('');
      return;
    }
    const cliente = clientes.find(c => c._id === clienteId);
    if (cliente) {
      const hoy = new Date();
      const fechaEst = new Date(hoy);
      fechaEst.setDate(hoy.getDate() + (cliente.condiciones?.diasHabiles ?? 0));
      setFechaEstimada(fechaEst.toISOString().split('T')[0]);
    }
  }, [clienteId, clientes]);

  if (!isAuthorized) return null;

  // Filtros y handlers
  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  const handleAgregarProducto = (producto: ProductoOption) => {
    if (!producto.stock.length) {
      Swal.fire('Sin stock', `El producto "${producto.nombre}" no tiene stock disponible.`, 'warning');
      return;
    }
    setProductosEnPedido(prev => [
      ...prev,
      { producto, deposito: producto.stock[0].deposito, cantidad: 1, tipoPrecio: 'minorista' }
    ]);
    setBusquedaProducto('');
  };

  const handleActualizarProducto = (index: number, field: 'deposito' | 'cantidad' | 'tipoPrecio', value: string | number) => {
    setProductosEnPedido(prev => {
      const nuevo = [...prev];
      nuevo[index] = { ...nuevo[index], [field]: value };
      return nuevo;
    });
  };

  const handleEliminarProducto = (index: number) => {
    setProductosEnPedido(prev => prev.filter((_, i) => i !== index));
  };

  const total = productosEnPedido.reduce((sum, p) => {
    const precio = p.tipoPrecio === 'minorista' ? p.producto.precioMinorista : p.producto.precioMayorista;
    return sum + p.cantidad * precio;
  }, 0);

  const validate = () => {
    if (!clienteId) { Swal.fire('Atención', 'Debe seleccionar un cliente.', 'warning'); return false; }
    if (!deposito) { Swal.fire('Atención', 'Debe seleccionar un depósito de origen.', 'warning'); return false; }
    if (!productosEnPedido.length) { Swal.fire('Atención', 'Debe agregar al menos un producto.', 'warning'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const productosParaGuardar = productosEnPedido.map(p => ({
        producto: p.producto._id,
        nombre: p.producto.nombre,
        unidad: p.producto.unidad,
        deposito: p.deposito,
        cantidad: p.cantidad,
        tipoPrecio: p.tipoPrecio,
        precioAplicado: p.tipoPrecio === 'minorista' ? p.producto.precioMinorista : p.producto.precioMayorista,
        subtotal: p.cantidad * (p.tipoPrecio === 'minorista' ? p.producto.precioMinorista : p.producto.precioMayorista)
      }));

      const res = await fetch('/api/gestion/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          productos: productosParaGuardar,
          deposito,
          fechaEstimadaEntrega: fechaEstimada || null,
          notas: notas || null
        })
      });

      if (res.ok) {
        Swal.fire('¡Éxito!', 'Pedido creado con éxito.', 'success');
        router.push('/gestion/pedidos');
      } else {
        const error = await res.json();
        Swal.fire('Error', error.error || 'No se pudo crear el pedido', 'error');
      }
    } catch {
      Swal.fire('Error', 'Error de conexión con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  // JSX
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/gestion/pedidos" className="text-amber-500 hover:text-amber-400 flex items-center gap-1">
          ← Volver a pedidos
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Nuevo Pedido</h1>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2  items-center gap-2">
              <FaUser className="text-amber-400" /> Cliente *
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="">Seleccione un cliente</option>
              {clientes.map(cliente => (
                <option key={cliente._id} value={cliente._id}>
                  {cliente.razonSocial} ({cliente.nombre} {cliente.apellido})
                </option>
              ))}
            </select>
          </div>

          {/* Depósito y Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Depósito de origen *</label>
              <select
                value={deposito}
                onChange={(e) => setDeposito(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              >
                <option value="">Seleccione un depósito</option>
                {Array.from(new Set(productos.flatMap(p => p.stock.map(s => s.deposito)))).map(dep => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha estimada de entrega</label>
              <input
                type="date"
                value={fechaEstimada}
                onChange={(e) => setFechaEstimada(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Productos */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Agregar productos</label>
            <div className="relative">
              <input
                type="text"
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                placeholder="Buscar producto por nombre..."
                className="w-full px-4 py-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <FaShoppingCart className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            {busquedaProducto && productosFiltrados.length > 0 && (
              <div className="mt-2 bg-gray-750 rounded-lg max-h-60 overflow-y-auto border border-gray-600">
                {productosFiltrados.map(producto => (
                  <div
                    key={producto._id}
                    onClick={() => handleAgregarProducto(producto)}
                    className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
                  >
                    <div className="font-medium text-white">{producto.nombre}</div>
                    <div className="text-sm text-gray-300">
                      {producto.unidad} • Min: ${producto.precioMinorista.toFixed(2)} • May: ${producto.precioMayorista.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Stock: {producto.stock.map(s => `${s.deposito} (${s.cantidad})`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Productos seleccionados */}
          {productosEnPedido.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-amber-400">Productos seleccionados</h3>
              {productosEnPedido.map((item, index) => (
                <ProductoLinea
                  key={index}
                  producto={item.producto}
                  deposito={item.deposito}
                  cantidad={item.cantidad}
                  tipoPrecio={item.tipoPrecio}
                  onRemove={() => handleEliminarProducto(index)}
                  onChange={(field, value) => handleActualizarProducto(index, field, value)}
                />
              ))}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notas internas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Ej: Entregar antes de las 12hs"
            />
          </div>

          {/* Total y botones */}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between items-center text-lg">
              <span className="text-gray-300">Total:</span>
              <span className="text-white font-bold">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium py-3 rounded-lg transition disabled:opacity-70 shadow"
            >
              {loading ? 'Creando pedido...' : 'Crear Pedido'}
            </button>
            <Link
              href="/gestion/pedidos"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg text-center transition"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
