// src/app/gestion/pedidos/nuevo/components/NuevoPedidoClient.tsx
'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import { FaShoppingCart, FaUser, FaTruck, FaTag, FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProductoLinea from './ProductoLinea';
import { formatARS } from '@/app/lib/formatcurrenci';

// Tipos
interface ClienteOption {
  _id: string;
  razonSocial: string;
  nombre: string;
  apellido: string;
  condiciones?: { diasHabiles: number };
  telefono?: string;
}

interface ProductoOption {
  _id: string;
  nombre: string;
  unidad: string;
  precioOferta: number;
  precioMayorista: number;
  stock: Array<{ deposito: string; cantidad: number }>;
}

interface ProductoEnPedido {
  producto: ProductoOption;
  deposito: string;
  cantidad: number;
  tipoPrecio: 'mayorista' | 'oferta';
}

// ✅ Estados para manejar mensajes
interface ToastMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export default function NuevoPedidoClient({
  clienteIdFromUrl = '',
}: {
  clienteIdFromUrl?: string;
}) {
  const isAuthorized = useAdminAuthorization();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [clienteId, setClienteId] = useState<string>('');
  const [deposito, setDeposito] = useState<string>('');
  const [origen, setOrigen] = useState<string>('mostrador');
  const [fechaEstimada, setFechaEstimada] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [productosEnPedido, setProductosEnPedido] = useState<ProductoEnPedido[]>([]);
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  
  // ✅ Estados para manejar mensajes
  const [toastQueue, setToastQueue] = useState<ToastMessage[]>([]);
  const [clientePreseleccionado, setClientePreseleccionado] = useState(false);

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
        setToastQueue(prev => [...prev, { type: 'error', message: 'No se pudieron cargar clientes o productos' }]);
      }
    };

    loadData();
  }, [isAuthorized]);

  // ✅ Mostrar toast cuando hay mensajes en cola
  useEffect(() => {
    if (toastQueue.length > 0) {
      const { type, message } = toastQueue[0];
      
      switch (type) {
        case 'success':
          toast.success(message, { position: "top-right", autoClose: 3000 });
          break;
        case 'error':
          toast.error(message, { position: "top-right", autoClose: 5000 });
          break;
        case 'warning':
          toast.warning(message, { position: "top-right", autoClose: 3000 });
          break;
        case 'info':
          toast.info(message, { position: "top-right", autoClose: 1500 });
          break;
      }
      
      // Eliminar el mensaje procesado
      setToastQueue(prev => prev.slice(1));
    }
  }, [toastQueue]);

  // ✅ Preseleccionar cliente desde URL (sin toast en setState)
  useEffect(() => {
    if (clienteIdFromUrl && clientes.length > 0 && !clientePreseleccionado) {
      const clienteExiste = clientes.some(c => c._id === clienteIdFromUrl);
      if (clienteExiste) {
        setClienteId(clienteIdFromUrl);
        setClientePreseleccionado(true);
        setToastQueue(prev => [...prev, { type: 'success', message: 'Cliente preseleccionado' }]);
      }
    }
  }, [clienteIdFromUrl, clientes, clientePreseleccionado]);

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

  // Manejar teclas en búsqueda
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!searchResultsOpen || productosFiltrados.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex(prev => 
        prev < productosFiltrados.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleAgregarProducto(productosFiltrados[selectedResultIndex]);
      setSearchResultsOpen(false);
      setSelectedResultIndex(0);
    } else if (e.key === 'Escape') {
      setSearchResultsOpen(false);
      setSelectedResultIndex(0);
    }
  };

  if (!isAuthorized) return null;

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  // ✨ NUEVA LÓGICA: Agregar o incrementar (SIN TOAST EN SETSTATE)
  const handleAgregarProducto = (producto: ProductoOption) => {
    if (!producto.stock.length) {
      setToastQueue(prev => [...prev, { 
        type: 'warning', 
        message: `El producto "${producto.nombre}" no tiene stock disponible.` 
      }]);
      return;
    }

    setProductosEnPedido(prev => {
      const existe = prev.findIndex(item => item.producto._id === producto._id);
      
      if (existe !== -1) {
        // Si ya existe, incrementamos la cantidad
        const nuevo = [...prev];
        nuevo[existe] = {
          ...nuevo[existe],
          cantidad: nuevo[existe].cantidad + 1
        };
        // ✅ Toast fuera del setState
        setToastQueue(prevQueue => [...prevQueue, { 
          type: 'info', 
          message: `+1 ${producto.nombre}` 
        }]);
        return nuevo;
      } else {
        // Si no existe, lo agregamos al inicio
        const nuevoProducto: ProductoEnPedido = {
          producto,
          deposito: producto.stock[0].deposito,
          cantidad: 1,
          tipoPrecio: 'mayorista' // ✅ SIEMPRE mayorista por default
        };
        // ✅ Toast fuera del setState
        setToastQueue(prevQueue => [...prevQueue, { 
          type: 'success', 
          message: `"${producto.nombre}" agregado` 
        }]);
        return [nuevoProducto, ...prev];
      }
    });

    setBusquedaProducto('');
    setSearchResultsOpen(false);
    setSelectedResultIndex(0);
    searchInputRef.current?.focus();
  };

  const handleActualizarProducto = (index: number, field: 'deposito' | 'cantidad' | 'tipoPrecio', value: string | number) => {
    setProductosEnPedido(prev => {
      const nuevo = [...prev];
      nuevo[index] = { ...nuevo[index], [field]: value };
      return nuevo;
    });
  };

  const handleEliminarProducto = (index: number) => {
    const productoNombre = productosEnPedido[index].producto.nombre;
    
    setProductosEnPedido(prev => prev.filter((_, i) => i !== index));
    
    // ✅ Toast fuera del setState
    setToastQueue(prev => [...prev, { 
      type: 'info', 
      message: `"${productoNombre}" eliminado` 
    }]);
  };

  const total = productosEnPedido.reduce((sum, p) => {
    const precio = p.tipoPrecio === 'mayorista' 
      ? p.producto.precioMayorista 
      : (p.producto.precioOferta || p.producto.precioMayorista);
    return sum + p.cantidad * precio;
  }, 0);

  const validate = () => {
    if (!clienteId) {
      setToastQueue(prev => [...prev, { 
        type: 'warning', 
        message: 'Debe seleccionar un cliente.' 
      }]);
      return false;
    }
    if (!deposito) {
      setToastQueue(prev => [...prev, { 
        type: 'warning', 
        message: 'Debe seleccionar un depósito de origen.' 
      }]);
      return false;
    }
    if (!productosEnPedido.length) {
      setToastQueue(prev => [...prev, { 
        type: 'warning', 
        message: 'Debe agregar al menos un producto.' 
      }]);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const productosParaGuardar = productosEnPedido.map(p => {
        const precioAplicado = p.tipoPrecio === 'mayorista' 
          ? p.producto.precioMayorista 
          : (p.producto.precioOferta || p.producto.precioMayorista);
        
        return {
          producto: p.producto._id,
          nombre: p.producto.nombre,
          unidad: p.producto.unidad,
          deposito: p.deposito,
          cantidad: p.cantidad,
          tipoPrecio: p.tipoPrecio,
          precioAplicado: precioAplicado,
          subtotal: p.cantidad * precioAplicado
        };
      });

      const res = await fetch('/api/gestion/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          productos: productosParaGuardar,
          deposito,
          origen,
          fechaEstimadaEntrega: fechaEstimada || null,
          notas: notas || null
        })
      });

      if (res.ok) {
        setToastQueue(prev => [...prev, { 
          type: 'success', 
          message: '¡Pedido creado con éxito!' 
        }]);
        setTimeout(() => router.push('/gestion/pedidos'), 1000);
      } else {
        const error = await res.json();
        setToastQueue(prev => [...prev, { 
          type: 'error', 
          message: error.error || 'No se pudo crear el pedido' 
        }]);
      }
    } catch {
      setToastQueue(prev => [...prev, { 
        type: 'error', 
        message: 'Error de conexión con el servidor' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Calcular totales por tipo de precio
  const totalMayorista = productosEnPedido
    .filter(p => p.tipoPrecio === 'mayorista')
    .reduce((sum, p) => sum + p.cantidad * p.producto.precioMayorista, 0);
  
  const totalOferta = productosEnPedido
    .filter(p => p.tipoPrecio === 'oferta')
    .reduce((sum, p) => sum + p.cantidad * (p.producto.precioOferta || 0), 0);

  // Obtener depósitos únicos con stock
  const depositosDisponibles = Array.from(
    new Set(productos.flatMap(p => p.stock.map(s => s.deposito)))
  );

  // ✅ Función para eliminar todos los productos
  const handleEliminarTodos = () => {
    setProductosEnPedido([]);
    setToastQueue(prev => [...prev, { 
      type: 'info', 
      message: 'Productos eliminados' 
    }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6 md:p-8">
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/gestion/pedidos" 
          className="text-amber-500 hover:text-amber-400 flex items-center gap-2 transition-colors group"
          aria-label="Volver a pedidos"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a pedidos
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <FaShoppingCart className="text-amber-500" />
          Nuevo Pedido
        </h1>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50 shadow-2xl max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
              <FaUser className="text-amber-400" /> Cliente *
            </label>
            <div className="relative">
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500"
                required
                aria-label="Seleccionar cliente"
              >
                <option value="">Seleccione un cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente._id} value={cliente._id}>
                    {cliente.razonSocial} {cliente.nombre && `(${cliente.nombre} ${cliente.apellido})`}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Depósito, Fecha y Origen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                <FaTruck className="text-amber-400" /> Depósito *
              </label>
              <div className="relative">
                <select
                  value={deposito}
                  onChange={(e) => setDeposito(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500"
                  required
                  aria-label="Seleccionar depósito"
                >
                  <option value="">Seleccione un depósito</option>
                  {depositosDisponibles.map(dep => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2">Fecha estimada</label>
              <input
                type="date"
                value={fechaEstimada}
                onChange={(e) => setFechaEstimada(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500"
                aria-label="Fecha estimada de entrega"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                <FaTag className="text-amber-400" /> Origen *
              </label>
              <div className="relative">
                <select
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500"
                  required
                  aria-label="Seleccionar origen del pedido"
                >
                  <option value="mostrador">Mostrador</option>
                  <option value="online">Online</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-200 mb-2">Agregar productos</label>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={busquedaProducto}
                onChange={(e) => {
                  setBusquedaProducto(e.target.value);
                  setSearchResultsOpen(e.target.value.length > 0);
                }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setSearchResultsOpen(busquedaProducto.length > 0)}
                onBlur={() => setTimeout(() => setSearchResultsOpen(false), 200)}
                placeholder="Buscar producto por nombre... (presiona Enter para seleccionar)"
                className="w-full px-4 py-3.5 pl-10 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500"
                aria-label="Buscar producto"
              />
              <FaShoppingCart className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              {busquedaProducto && (
                <button
                  type="button"
                  onClick={() => setBusquedaProducto('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            {searchResultsOpen && busquedaProducto && productosFiltrados.length > 0 && (
              <div className="mt-2 bg-gray-700/90 rounded-xl max-h-72 overflow-y-auto border border-gray-600 shadow-lg animate-fade-in">
                {productosFiltrados.map((producto, index) => {
                  const hasStock = producto.stock.some(s => s.cantidad > 0);
                  const lowStock = producto.stock.some(s => s.cantidad > 0 && s.cantidad < 10);
                  
                  return (
                    <div
                      key={producto._id}
                      onClick={() => handleAgregarProducto(producto)}
                      onMouseEnter={() => setSelectedResultIndex(index)}
                      className={`p-4 cursor-pointer transition-all duration-200 ${
                        selectedResultIndex === index 
                          ? 'bg-amber-500/20 border-l-4 border-amber-500' 
                          : 'hover:bg-gray-600/50'
                      } ${index < productosFiltrados.length - 1 ? 'border-b border-gray-600' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{producto.nombre}</span>
                            {lowStock && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <FaExclamationTriangle className="text-yellow-400" size={10} />
                                Stock bajo
                              </span>
                            )}
                            {!hasStock && (
                              <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                                Sin stock
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-300 mt-1 flex gap-4">
                            <span className="flex items-center gap-1">
                              <span className="text-gray-400">Unidad:</span>
                              <span className="font-medium">{producto.unidad}</span>
                            </span>
                            {producto.precioOferta && (
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
                          Enter para seleccionar
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-2">
                        {producto.stock.map((s, i) => (
                          <span key={i} className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded">
                            {s.deposito}: <span className="font-medium text-white">{s.cantidad}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {searchResultsOpen && busquedaProducto && productosFiltrados.length === 0 && (
              <div className="mt-2 bg-gray-700 rounded-xl p-4 border border-gray-600 text-center text-gray-400">
                No se encontraron productos con "{busquedaProducto}"
              </div>
            )}
          </div>

          {/* Productos seleccionados */}
          {productosEnPedido.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <FaShoppingCart /> Productos seleccionados ({productosEnPedido.length})
                </h3>
                {productosEnPedido.length > 1 && (
                  <button
                    type="button"
                    onClick={handleEliminarTodos}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar todos
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                {productosEnPedido.map((item, index) => (
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

          {/* Notas */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
              <FaInfoCircle className="text-amber-400" /> Notas internas
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500 resize-none"
              placeholder="Ej: Entregar antes de las 12hs, Cliente especial, etc."
              aria-label="Notas internas"
            />
            <p className="text-xs text-gray-400">Información adicional para el equipo de logística</p>
          </div>

          {/* Resumen y totales */}
          <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <FaCheckCircle className="text-green-400" /> Resumen del pedido
            </h4>
            
            <div className="space-y-2">
              {totalMayorista > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Subtotal Mayorista:</span>
                  <span className="font-medium text-amber-400">{formatARS(totalMayorista)}</span>
                </div>
              )}
              
              {totalOferta > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Subtotal Oferta:</span>
                  <span className="font-medium text-green-400">{formatARS(totalOferta)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-lg pt-2 border-t border-gray-600">
                <span className="text-gray-200 font-semibold">Total:</span>
                <span className="text-white font-bold text-xl">{formatARS(total)}</span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-amber-500/30 flex items-center justify-center gap-2"
              aria-label="Crear pedido"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando pedido...
                </>
              ) : (
                <>
                  <FaCheckCircle /> Crear Pedido
                </>
              )}
            </button>
            
            <Link
              href="/gestion/pedidos"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl text-center transition-all duration-200 flex items-center justify-center gap-2"
              aria-label="Cancelar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}