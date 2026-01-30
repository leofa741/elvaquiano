// app/gestion/presupuestos/nuevo/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import { FaFileInvoice, FaUser, FaCalendar } from 'react-icons/fa';
import Swal from 'sweetalert2';
import ProductoLinea from '../../pedidos/nuevo/components/ProductoLinea';
import { formatARS } from '@/app/lib/formatcurrenci';

// Tipos
interface ClienteOption {
  _id: string;
  razonSocial: string;
  nombre: string;
  apellido: string;
}


interface ProductoOption {
  _id: string;
  nombre: string;
  unidad: string;
  precioOferta: number;
  precioMayorista: number;
  stock: Array<{ deposito: string; cantidad: number }>;
}

interface ProductoEnPresupuesto {
  producto: ProductoOption;
  deposito: string;
  cantidad: number;
  tipoPrecio: 'mayorista' | 'oferta';
}

export default function NuevoPresupuestoPage() {
  const isAuthorized = useAdminAuthorization();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');

  const [clienteId, setClienteId] = useState<string>('');
  const [validoHasta, setValidoHasta] = useState<string>('');
  const [origen, setOrigen] = useState<string>('');
  const [productosEnPresupuesto, setProductosEnPresupuesto] = useState<ProductoEnPresupuesto[]>([]);

  // Cargar datos
  useEffect(() => {
    if (!isAuthorized) return;

    const loadData = async () => {
      try {
        const [resClientes, resProductos] = await Promise.all([
          fetch('/api/gestion/clientes'),
          fetch('/api/gestion/productos?all=true')
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

  if (!isAuthorized) return null;

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  // ✨ NUEVA LÓGICA: Evita duplicados + agrega al inicio
  const handleAgregarProducto = (producto: ProductoOption) => {
    if (producto.stock.length === 0) {
      Swal.fire('Sin stock', `El producto "${producto.nombre}" no tiene stock disponible.`, 'warning');
      return;
    }

    setProductosEnPresupuesto(prev => {
      const existeIndex = prev.findIndex(item => item.producto._id === producto._id);

      if (existeIndex !== -1) {
        // Ya existe: incrementar cantidad
        const nuevo = [...prev];
        nuevo[existeIndex] = {
          ...nuevo[existeIndex],
          cantidad: nuevo[existeIndex].cantidad + 1
        };
        return nuevo;
      } else {
        // No existe: agregar al inicio
        return [
          {
            producto,
            deposito: producto.stock[0].deposito,
            cantidad: 1,
            tipoPrecio: 'mayorista'
          },
          ...prev
        ];
      }
    });

    setBusquedaProducto('');
  };

  const handleActualizarProducto = (
    index: number,
    field: 'deposito' | 'cantidad' | 'tipoPrecio',
    value: string | number
  ) => {
    setProductosEnPresupuesto(prev => {
      const nuevo = [...prev];
      nuevo[index] = { ...nuevo[index], [field]: value };
      return nuevo;
    });
  };

  const handleEliminarProducto = (index: number) => {
    setProductosEnPresupuesto(prev => prev.filter((_, i) => i !== index));
  };

  const total = productosEnPresupuesto.reduce((sum, p) => {
    const precio = p.tipoPrecio === 'mayorista' ? p.producto.precioMayorista : p.producto.precioOferta;
    return sum + p.cantidad * precio;
  }, 0);

  const validate = (): boolean => {
    if (!clienteId) {
      Swal.fire('Atención', 'Debe seleccionar un cliente.', 'warning');
      return false;
    }
    if (productosEnPresupuesto.length === 0) {
      Swal.fire('Atención', 'Debe agregar al menos un producto.', 'warning');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const productosParaGuardar = productosEnPresupuesto.map(p => {
        const unidadesFisicas = p.cantidad;

        return {
          producto: p.producto._id,
          nombre: p.producto.nombre,
          unidad: p.producto.unidad,
          deposito: p.deposito,
          cantidad: p.cantidad,
          unidadesFisicas,
          tipoPrecio: p.tipoPrecio,
          origen: origen,
          precioAplicado: p.tipoPrecio === 'mayorista' ? p.producto.precioMayorista : p.producto.precioOferta,
          subtotal: p.cantidad * (p.tipoPrecio === 'mayorista' ? p.producto.precioMayorista : p.producto.precioOferta)
        };
      });

      const res = await fetch('/api/gestion/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          productos: productosParaGuardar,
          validoHasta: validoHasta || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        Swal.fire('¡Éxito!', 'Presupuesto creado con éxito.', 'success');
        router.push(`/gestion/presupuestos/imprimir/${data._id}`);
      } else {
        const error = await res.json();
        Swal.fire('Error', error.error || 'No se pudo crear el presupuesto', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/gestion/presupuestos" className="text-amber-500 hover:text-amber-400 flex items-center gap-1">
          ← Volver a presupuestos
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Nuevo Presupuesto</h1>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FaUser className="text-amber-400" />
              Cliente *
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FaCalendar className="text-amber-400" />
              Válido hasta (opcional)
            </label>
            <input
              type="date"
              value={validoHasta}
              onChange={(e) => setValidoHasta(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Origen del pedido *
            </label>
            <select
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="">Seleccione...</option>
              <option value="mostrador">Mostrador</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Agregar productos
            </label>
            <div className="relative">
              <input
                type="text"
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                placeholder="Buscar producto por nombre..."
                className="w-full px-4 py-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <FaFileInvoice className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                      {producto.unidad} • {formatARS(producto.precioOferta)} (oferta) • {formatARS(producto.precioMayorista)} (mayorista)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {productosEnPresupuesto.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-amber-400">Productos seleccionados</h3>
              {productosEnPresupuesto.map((item, index) => (
                <ProductoLinea
                  key={`${item.producto._id}-${index}`}
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

          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between items-center text-lg">
              <span className="text-gray-300">Total:</span>
              <span className="text-white font-bold">{formatARS(total)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium py-3 rounded-lg transition disabled:opacity-70 shadow"
            >
              {loading ? 'Creando...' : 'Crear Presupuesto'}
            </button>
            <Link
              href="/gestion/presupuestos"
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