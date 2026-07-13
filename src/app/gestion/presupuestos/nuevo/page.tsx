'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import { FaFileInvoice, FaUser, FaCalendar, FaSync } from 'react-icons/fa'; // ✅ Agregado FaSync
import Swal from 'sweetalert2';
import ProductoLinea from '../../pedidos/nuevo/components/ProductoLinea';
import { formatARS } from '@/app/lib/formatcurrenci';
import ComboSearch from '../../pedidos/nuevo/components/ComboSearch';

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

// ✅ Clave única para el borrador en localStorage
const STORAGE_KEY = 'presupuesto_draft_v1';

export default function NuevoPresupuestoPage() {
  const isAuthorized = useAdminAuthorization();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false); // ✅ Para el botón de refresh

  const [clienteId, setClienteId] = useState<string>('');
  const [validoHasta, setValidoHasta] = useState<string>('');
  const [origen, setOrigen] = useState<string>('');
  const [productosEnPresupuesto, setProductosEnPresupuesto] = useState<ProductoEnPresupuesto[]>([]);

  // ✅ CARGAR BORRADOR desde localStorage al iniciar (ANTES de cargar datos de la API)
  useEffect(() => {
    if (!isAuthorized) return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setClienteId(data.clienteId || '');
        setValidoHasta(data.validoHasta || '');
        setOrigen(data.origen || '');
        setProductosEnPresupuesto(data.productosEnPresupuesto || []);
      }
    } catch (err) {
      console.error('Error al cargar borrador:', err);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isAuthorized]);

  // ✅ GUARDAR BORRADOR automáticamente cada vez que cambia algo
  useEffect(() => {
    if (!isAuthorized) return;
    
    // Solo guardar si hay algo que valga la pena (evita guardar estados vacíos al inicio)
    const tieneContenido = clienteId || productosEnPresupuesto.length > 0 || validoHasta || origen;
    
    if (tieneContenido) {
      const data = {
        clienteId,
        validoHasta,
        origen,
        productosEnPresupuesto,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [clienteId, validoHasta, origen, productosEnPresupuesto, isAuthorized]);

  // ✅ Función para cargar datos desde la API (reutilizable)
  const cargarDatos = async () => {
    try {
      const [resClientes, resProductos] = await Promise.all([
        fetch('/api/gestion/clientes', { cache: 'no-store' }),
        fetch('/api/gestion/productos?all=true', { cache: 'no-store' })
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

  // Cargar datos inicial
  useEffect(() => {
    if (!isAuthorized) return;
    cargarDatos();
  }, [isAuthorized]);

  // ✅ NUEVO: Botón para refrescar SOLO los productos (sin perder el presupuesto)
  const handleRefrescarProductos = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/gestion/productos?all=true', { cache: 'no-store' });
      const data = await res.json();
      setProductos(
        data.products?.filter((p: any) =>
          p.stock?.some((s: any) => s.cantidad > 0)
        ) || []
      );
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Lista de productos actualizada',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire('Error', 'No se pudieron actualizar los productos', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isAuthorized) return null;

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  const handleAgregarProducto = (producto: ProductoOption) => {
    if (producto.stock.length === 0) {
      Swal.fire('Sin stock', `El producto "${producto.nombre}" no tiene stock disponible.`, 'warning');
      return;
    }

    setProductosEnPresupuesto(prev => {
      const existeIndex = prev.findIndex(item => item.producto._id === producto._id);

      if (existeIndex !== -1) {
        const nuevo = [...prev];
        nuevo[existeIndex] = {
          ...nuevo[existeIndex],
          cantidad: nuevo[existeIndex].cantidad + 1
        };
        return nuevo;
      } else {
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
        // ✅ LIMPIAR el borrador al crear exitosamente
        localStorage.removeItem(STORAGE_KEY);
        
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/gestion/presupuestos" className="text-amber-500 hover:text-amber-400 flex items-center gap-2 transition-colors group" aria-label="Volver a presupuestos">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Volver a presupuestos
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <FaFileInvoice className="text-amber-500" /> Nuevo Presupuesto
        </h1>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50 shadow-2xl max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <ComboSearch
            items={clientes}
            value={clienteId}
            onChange={setClienteId}
            label="Cliente"
            icon={<FaUser className="text-amber-400" />}
            required
            placeholder="Escribe iniciales, razón social o nombre..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                <FaCalendar className="text-amber-400" /> Válido hasta (opcional)
              </label>
              <input
                type="date"
                value={validoHasta}
                onChange={(e) => setValidoHasta(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2">Origen del pedido *</label>
              <div className="relative">
                <select
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500"
                  required
                >
                  <option value="">Seleccione...</option>
                  <option value="mostrador">Mostrador</option>
                  <option value="online">Online</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-200 mb-2">Agregar productos</label>
            <div className="relative">
              <input
                type="text"
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                placeholder="Buscar producto por nombre..."
                className="w-full px-4 py-3.5 pl-10 pr-12 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500"
              />
              <FaFileInvoice className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              
              {/* ✅ BOTÓN DE REFRESCAR PRODUCTOS */}
              <button
                type="button"
                onClick={handleRefrescarProductos}
                disabled={isRefreshing}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-amber-400 transition-colors disabled:opacity-50"
                title="Actualizar lista de productos (si agregaste stock recientemente)"
              >
                <FaSync className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {busquedaProducto && productosFiltrados.length > 0 && (
              <div className="mt-2 bg-gray-700/90 rounded-xl max-h-72 overflow-y-auto border border-gray-600 shadow-lg animate-fade-in">
                {productosFiltrados.map(producto => {
                  const hasStock = producto.stock.some(s => s.cantidad > 0);
                  return (
                    <div
                      key={producto._id}
                      onClick={() => handleAgregarProducto(producto)}
                      className="p-4 cursor-pointer transition-all duration-200 hover:bg-amber-500/20 border-b border-gray-600 last:border-0"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{producto.nombre}</span>
                            {!hasStock && <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">Sin stock</span>}
                          </div>
                          <div className="text-sm text-gray-300 mt-1 flex gap-4">
                            <span className="flex items-center gap-1">
                              <span className="text-gray-400">Unidad:</span>
                              <span className="font-medium">{producto.unidad}</span>
                            </span>
                            {producto.precioOferta > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="text-gray-400">Oferta:</span>
                                <span className="font-bold text-green-400">{formatARS(producto.precioOferta)}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <span className="text-gray-400">Mayorista:</span>
                              <span className="font-medium text-amber-400">{formatARS(producto.precioMayorista)}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full whitespace-nowrap">
                          Click para agregar
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {productosEnPresupuesto.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <FaFileInvoice /> Productos seleccionados ({productosEnPresupuesto.length})
              </h3>
              <div className="space-y-2">
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
            </div>
          )}

          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between items-center text-lg">
              <span className="text-gray-200 font-semibold">Total:</span>
              <span className="text-white font-bold text-xl">{formatARS(total)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-amber-500/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando...
                </>
              ) : (
                <>📄 Crear Presupuesto</>
              )}
            </button>
            <Link
              href="/gestion/presupuestos"
              onClick={() => localStorage.removeItem(STORAGE_KEY)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl text-center transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}