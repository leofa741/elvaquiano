'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import { FaShoppingCart, FaUser, FaTruck, FaTag, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaBook } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProductoLinea from './ProductoLinea';
import { formatARS } from '@/app/lib/formatcurrenci';
import ComboSearch from './ComboSearch';

// ✅ ID dummy válido (24 caracteres hex) para que MongoDB no lance error de Cast a ObjectId
const DEUDA_PRODUCT_ID = '000000000000000000000000';

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
  const [deposito, setDeposito] = useState<string>('san vicente');
  const [origen, setOrigen] = useState<string>('mostrador');
  const [fechaEstimada, setFechaEstimada] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [productosEnPedido, setProductosEnPedido] = useState<ProductoEnPedido[]>([]);
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  const [toastQueue, setToastQueue] = useState<ToastMessage[]>([]);
  const [clientePreseleccionado, setClientePreseleccionado] = useState(false);
  const [registrarEnCuentaCorriente, setRegistrarEnCuentaCorriente] = useState(false);

  // ✅ NUEVOS ESTADOS PARA DEUDA ANTERIOR
  const [saldoPendienteCliente, setSaldoPendienteCliente] = useState<number>(0);
  const [incluirDeudaAnterior, setIncluirDeudaAnterior] = useState<boolean>(false);

  // Cargar datos iniciales
  useEffect(() => {
    if (!isAuthorized) return;
    const loadData = async () => {
      try {
        const [resClientes, resProductos] = await Promise.all([
          fetch('/api/gestion/clientes', { cache: 'no-store' }),
          fetch('/api/gestion/productos?all=true', { cache: 'no-store' })
        ]);
        
        const dataClientes = await resClientes.json();
        const dataProductos = await resProductos.json();

        // ✅ CORRECCIÓN: Extraer el array del objeto { clientes: [...] }
        const listaClientes = dataClientes.clientes || dataClientes;
        
        // Filtramos solo los activos (usamos !== false para incluir datos antiguos sin el campo)
        setClientes(Array.isArray(listaClientes) ? listaClientes.filter((c: any) => c.activo !== false) : []);
        
        setProductos(dataProductos.products?.filter((p: any) => p.stock?.some((s: any) => s.cantidad > 0)) || []);
      } catch (err) {
        console.error('Error cargando datos iniciales:', err);
        setToastQueue(prev => [...prev, { type: 'error', message: 'No se pudieron cargar clientes o productos' }]);
      }
    };
    loadData();
  }, [isAuthorized]);
  useEffect(() => {
    if (toastQueue.length > 0) {
      const { type, message } = toastQueue[0];
      switch (type) {
        case 'success': toast.success(message, { position: "top-right", autoClose: 3000 }); break;
        case 'error': toast.error(message, { position: "top-right", autoClose: 5000 }); break;
        case 'warning': toast.warning(message, { position: "top-right", autoClose: 3000 }); break;
        case 'info': toast.info(message, { position: "top-right", autoClose: 1500 }); break;
      }
      setToastQueue(prev => prev.slice(1));
    }
  }, [toastQueue]);

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

  useEffect(() => {
    if (!clienteId) {
      setDeposito('san vicente');
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

  // ✅ NUEVO: Consultar saldo del cliente cuando cambia la selección
  useEffect(() => {
    // Resetear al cambiar de cliente
    setIncluirDeudaAnterior(false);
    setProductosEnPedido(prev => prev.filter(p => p.producto._id !== DEUDA_PRODUCT_ID));

    if (!clienteId) {
      setSaldoPendienteCliente(0);
      return;
    }

    const fetchSaldo = async () => {
      try {
        const res = await fetch(`/api/gestion/cuentas-corrientes?clienteId=${clienteId}`);
        const data = await res.json();
        setSaldoPendienteCliente(data.saldoPendiente || 0);
      } catch (err) {
        console.error('Error al cargar saldo:', err);
      }
    };
    fetchSaldo();
  }, [clienteId]);

  // ✅ NUEVO: Actualizar el depósito del ítem de deuda si el usuario cambia el depósito principal
  useEffect(() => {
    if (incluirDeudaAnterior && saldoPendienteCliente > 0) {
      setProductosEnPedido(prev => prev.map(p =>
        p.producto._id === DEUDA_PRODUCT_ID ? { ...p, deposito } : p
      ));
    }
  }, [deposito, incluirDeudaAnterior, saldoPendienteCliente]);

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!searchResultsOpen || productosFiltrados.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex(prev => prev < productosFiltrados.length - 1 ? prev + 1 : prev);
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

  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()));

  const handleAgregarProducto = (producto: ProductoOption) => {
    if (!producto.stock.length) {
      setToastQueue(prev => [...prev, { type: 'warning', message: `El producto "${producto.nombre}" no tiene stock disponible.` }]);
      return;
    }
    setProductosEnPedido(prev => {
      const existe = prev.findIndex(item => item.producto._id === producto._id);
      if (existe !== -1) {
        const nuevo = [...prev];
        nuevo[existe] = { ...nuevo[existe], cantidad: nuevo[existe].cantidad + 1 };
        setToastQueue(prevQueue => [...prevQueue, { type: 'info', message: `+1 ${producto.nombre}` }]);
        return nuevo;
      } else {
        const nuevoProducto: ProductoEnPedido = { producto, deposito: producto.stock[0].deposito, cantidad: 1, tipoPrecio: 'mayorista' };
        setToastQueue(prevQueue => [...prevQueue, { type: 'success', message: `"${producto.nombre}" agregado` }]);
        return [nuevoProducto, ...prev];
      }
    });
    setBusquedaProducto(''); setSearchResultsOpen(false); setSelectedResultIndex(0); searchInputRef.current?.focus();
  };

  const handleActualizarProducto = (index: number, field: 'deposito' | 'cantidad' | 'tipoPrecio', value: string | number) => {
    setProductosEnPedido(prev => {
      const nuevo = [...prev];
      nuevo[index] = { ...nuevo[index], [field]: value };
      return nuevo;
    });
  };

  // ✅ MODIFICADO: Manejar eliminación especial si es el ítem de deuda
  const handleEliminarProducto = (index: number) => {
    const producto = productosEnPedido[index].producto;
    const esDeuda = producto._id === DEUDA_PRODUCT_ID;

    setProductosEnPedido(prev => prev.filter((_, i) => i !== index));

    if (esDeuda) {
      setIncluirDeudaAnterior(false);
    }

    setToastQueue(prev => [...prev, { type: 'info', message: `"${producto.nombre}" eliminado` }]);
  };

  const total = productosEnPedido.reduce((sum, p) => {
    const precio = p.tipoPrecio === 'mayorista' ? p.producto.precioMayorista : (p.producto.precioOferta || p.producto.precioMayorista);
    return sum + p.cantidad * precio;
  }, 0);

  const validate = () => {
    if (!clienteId) { setToastQueue(prev => [...prev, { type: 'warning', message: 'Debe seleccionar un cliente.' }]); return false; }
    if (!deposito) { setToastQueue(prev => [...prev, { type: 'warning', message: 'Debe seleccionar un depósito de origen.' }]); return false; }
    if (!productosEnPedido.length) { setToastQueue(prev => [...prev, { type: 'warning', message: 'Debe agregar al menos un producto.' }]); return false; }
    return true;
  };

  // ✅ NUEVO: Función para agregar/quitar la deuda del listado de productos
  const toggleDeudaAnterior = (checked: boolean) => {
    setIncluirDeudaAnterior(checked);
    if (checked && saldoPendienteCliente > 0) {
      setProductosEnPedido(prev => {
        if (prev.some(p => p.producto._id === DEUDA_PRODUCT_ID)) return prev;
        return [{
          producto: {
            _id: DEUDA_PRODUCT_ID,
            nombre: 'SALDO ANTERIOR PENDIENTE',
            unidad: 'unidad',
            precioMayorista: saldoPendienteCliente,
            precioOferta: 0,
            stock: [{ deposito, cantidad: 1 }]
          },
          deposito: deposito,
          cantidad: 1,
          tipoPrecio: 'mayorista'
        }, ...prev];
      });
      setToastQueue(prev => [...prev, { type: 'info', message: `Deuda anterior de ${formatARS(saldoPendienteCliente)} agregada al pedido.` }]);
    } else {
      setProductosEnPedido(prev => prev.filter(p => p.producto._id !== DEUDA_PRODUCT_ID));
    }
  };

  const handleSubmit = async (e: React.FormEvent, imprimir: boolean = false) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const productosParaGuardar = productosEnPedido.map(p => {
        const precioAplicado = p.tipoPrecio === 'mayorista' ? p.producto.precioMayorista : (p.producto.precioOferta || p.producto.precioMayorista);
        return {
          producto: p.producto._id, // El ID dummy '00000000...' es válido para MongoDB
          nombre: p.producto.nombre,
          unidad: p.producto.unidad,
          deposito: p.deposito,
          cantidad: p.cantidad,
          tipoPrecio: p.tipoPrecio,
          precioAplicado: precioAplicado,
          subtotal: parseFloat((p.cantidad * precioAplicado).toFixed(2))
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
        const nuevoPedido = await res.json();

        if (registrarEnCuentaCorriente) {
          try {
            const resCC = await fetch('/api/gestion/cuentas-corrientes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clienteId,
                pedidoId: nuevoPedido._id,
                tipo: 'pedido',
                importe: total, // ✅ Incluye automáticamente la deuda si fue marcada
                formaPago: 'Saldo Pendiente',
                descripcion: `Creación de Pedido #${nuevoPedido._id.slice(-6).toUpperCase()}`
              })
            });
            if (!resCC.ok) {
              setToastQueue(prev => [...prev, { type: 'warning', message: '⚠️ Pedido creado, pero falló el registro en Cta. Cte.' }]);
            }
          } catch (err) {
            console.error('Error en cuenta corriente:', err);
            setToastQueue(prev => [...prev, { type: 'warning', message: '⚠️ Error al actualizar la cuenta corriente.' }]);
          }
        }

        if (imprimir) {
          setToastQueue(prev => [...prev, { type: 'success', message: '¡Pedido creado! Preparando impresión...' }]);
          setTimeout(() => router.push(`/gestion/pedidos/${nuevoPedido._id}/imprimir?afterPrint=/gestion/pedidos`), 800);
        } else {
          setToastQueue(prev => [...prev, { type: 'success', message: '¡Pedido creado con éxito!' }]);
          setTimeout(() => router.push('/gestion/pedidos'), 1000);
        }
      } else {
        const error = await res.json();
        setToastQueue(prev => [...prev, { type: 'error', message: error.error || 'No se pudo crear el pedido' }]);
      }
    } catch {
      setToastQueue(prev => [...prev, { type: 'error', message: 'Error de conexión con el servidor' }]);
    } finally {
      setLoading(false);
    }
  };

  const totalMayorista = productosEnPedido.filter(p => p.tipoPrecio === 'mayorista' && p.producto._id !== DEUDA_PRODUCT_ID).reduce((sum, p) => sum + p.cantidad * p.producto.precioMayorista, 0);
  const totalOferta = productosEnPedido.filter(p => p.tipoPrecio === 'oferta').reduce((sum, p) => sum + p.cantidad * (p.producto.precioOferta || 0), 0);
  const depositosDisponibles = Array.from(new Set(productos.flatMap(p => p.stock.map(s => s.deposito))));
  const handleEliminarTodos = () => {
    setProductosEnPedido([]);
    setIncluirDeudaAnterior(false);
    setToastQueue(prev => [...prev, { type: 'info', message: 'Productos eliminados' }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6 md:p-8">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={true} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="dark" />

      <div className="flex items-center gap-4 mb-8">
        <Link href="/gestion/pedidos" className="text-amber-500 hover:text-amber-400 flex items-center gap-2 transition-colors group" aria-label="Volver a pedidos">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Volver a pedidos
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <FaShoppingCart className="text-amber-500" /> Nuevo Pedido
        </h1>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50 shadow-2xl max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <ComboSearch items={clientes} value={clienteId} onChange={setClienteId} label="Cliente" icon={<FaUser className="text-amber-400" />} required placeholder="Escribe iniciales, razón social o nombre..." />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2"><FaTruck className="text-amber-400" /> Depósito *</label>
              <div className="relative">
                <select value={deposito} onChange={(e) => setDeposito(e.target.value)} className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500" required>
                  <option value="">Seleccione un depósito</option>
                  {depositosDisponibles.map(dep => (<option key={dep} value={dep}>{dep}</option>))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2">Fecha estimada</label>
              <input type="date" value={fechaEstimada} onChange={(e) => setFechaEstimada(e.target.value)} className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2"><FaTag className="text-amber-400" /> Origen *</label>
              <div className="relative">
                <select value={origen} onChange={(e) => setOrigen(e.target.value)} className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500" required>
                  <option value="mostrador">Mostrador</option>
                  <option value="online">Online</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-200 mb-2">Agregar productos</label>
            <div className="relative">
              <input ref={searchInputRef} type="text" value={busquedaProducto} onChange={(e) => { setBusquedaProducto(e.target.value); setSearchResultsOpen(e.target.value.length > 0); }} onKeyDown={handleSearchKeyDown} onFocus={() => setSearchResultsOpen(busquedaProducto.length > 0)} onBlur={() => setTimeout(() => setSearchResultsOpen(false), 200)} placeholder="Buscar producto por nombre... (presiona Enter para seleccionar)" className="w-full px-4 py-3.5 pl-10 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500" />
              <FaShoppingCart className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              {busquedaProducto && (<button type="button" onClick={() => setBusquedaProducto('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors">✕</button>)}
            </div>
            {searchResultsOpen && busquedaProducto && productosFiltrados.length > 0 && (
              <div className="mt-2 bg-gray-700/90 rounded-xl max-h-72 overflow-y-auto border border-gray-600 shadow-lg animate-fade-in">
                {productosFiltrados.map((producto, index) => {
                  const hasStock = producto.stock.some(s => s.cantidad > 0);
                  const lowStock = producto.stock.some(s => s.cantidad > 0 && s.cantidad < 10);
                  return (
                    <div key={producto._id} onClick={() => handleAgregarProducto(producto)} onMouseEnter={() => setSelectedResultIndex(index)} className={`p-4 cursor-pointer transition-all duration-200 ${selectedResultIndex === index ? 'bg-amber-500/20 border-l-4 border-amber-500' : 'hover:bg-gray-600/50'} ${index < productosFiltrados.length - 1 ? 'border-b border-gray-600' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{producto.nombre}</span>
                            {lowStock && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full flex items-center gap-1"><FaExclamationTriangle className="text-yellow-400" size={10} /> Stock bajo</span>}
                            {!hasStock && <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">Sin stock</span>}
                          </div>
                          <div className="text-sm text-gray-300 mt-1 flex gap-4">
                            <span className="flex items-center gap-1"><span className="text-gray-400">Unidad:</span><span className="font-medium">{producto.unidad}</span></span>
                            {producto.precioOferta && <span className="flex items-center gap-1"><span className="text-gray-400">Oferta:</span><span className="font-bold text-green-400">{formatARS(producto.precioOferta)}</span></span>}
                            <span className="flex items-center gap-1"><span className="text-gray-400">Mayorista:</span><span className="font-medium text-amber-400">{formatARS(producto.precioMayorista)}</span></span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full whitespace-nowrap">Enter para seleccionar</div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-2">
                        {producto.stock.map((s, i) => (<span key={i} className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded">{s.deposito}: <span className="font-medium text-white">{s.cantidad}</span></span>))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {searchResultsOpen && busquedaProducto && productosFiltrados.length === 0 && (
              <div className="mt-2 bg-gray-700 rounded-xl p-4 border border-gray-600 text-center text-gray-400">No se encontraron productos con "{busquedaProducto}"</div>
            )}
          </div>

          {productosEnPedido.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2"><FaShoppingCart /> Productos seleccionados ({productosEnPedido.length})</h3>
                {productosEnPedido.length > 1 && (
                  <button type="button" onClick={handleEliminarTodos} className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
          

             
            {totalMayorista > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Subtotal Productos Mayorista:</span>
                <span className="font-medium text-amber-400">{formatARS(totalMayorista)}</span>
              </div>
            )}
            {totalOferta > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Subtotal Productos Oferta:</span>
                <span className="font-medium text-green-400">{formatARS(totalOferta)}</span>
              </div>
            )}
            

          {/* <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2"><FaInfoCircle className="text-amber-400" /> Notas internas</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 hover:border-gray-500 resize-none" placeholder="Ej: Entregar antes de las 12hs, Cliente especial, etc." />
            <p className="text-xs text-gray-400">Información adicional para el equipo de logística</p>
          </div>

          <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><FaCheckCircle className="text-green-400" /> Resumen del pedido</h4>

          
          {saldoPendienteCliente > 0 && (
            <div className="mb-4 p-3 bg-red-900/20 rounded-lg border border-red-700/50 flex items-start gap-3">
              <input
                type="checkbox"
                id="incluirDeuda"
                checked={incluirDeudaAnterior}
                onChange={(e) => toggleDeudaAnterior(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-red-500 text-red-500 focus:ring-red-500 bg-gray-700 cursor-pointer accent-red-500"
              />
              <label htmlFor="incluirDeuda" className="text-sm text-gray-200 cursor-pointer flex flex-col">
                <span className="font-semibold flex items-center gap-2 text-red-400">
                  <FaExclamationTriangle /> Incluir deuda anterior en este pedido
                </span>
                <span className="text-xs text-gray-300 mt-1">
                  Este cliente tiene un saldo pendiente de <strong>{formatARS(saldoPendienteCliente)}</strong>. Al marcar esta casilla, se agregará como un ítem en el pedido para que pueda saldarlo ahora.
                </span>
              </label>
            </div>
          )}

          <div className="space-y-2">
            {totalMayorista > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Subtotal Productos Mayorista:</span>
                <span className="font-medium text-amber-400">{formatARS(totalMayorista)}</span>
              </div>
            )}
            {totalOferta > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Subtotal Productos Oferta:</span>
                <span className="font-medium text-green-400">{formatARS(totalOferta)}</span>
              </div>
            )}

           
            {incluirDeudaAnterior && saldoPendienteCliente > 0 && (
              <div className="flex justify-between items-center text-sm border-t border-gray-600 pt-2 mt-2">
                <span className="text-red-400">+ Saldo Anterior Pendiente:</span>
                <span className="font-medium text-red-400">{formatARS(saldoPendienteCliente)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-lg pt-2 border-t border-gray-600">
              <span className="text-gray-200 font-semibold">Total a Pagar:</span>
              <span className="text-white font-bold text-xl">{formatARS(total)}</span>
            </div>
          </div>

      
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600 flex items-start gap-3">
            <input
              type="checkbox"
              id="registrarCC"
              checked={registrarEnCuentaCorriente}
              onChange={(e) => setRegistrarEnCuentaCorriente(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-500 text-amber-500 focus:ring-amber-500 bg-gray-700 cursor-pointer accent-amber-500"
            />
            <label htmlFor="registrarCC" className="text-sm text-gray-200 cursor-pointer flex flex-col">
              <span className="font-semibold flex items-center gap-2">
                <FaBook className="text-amber-400" /> Registrar en Cuenta Corriente
              </span>
              <span className="text-xs text-gray-400 mt-1">
                Se agregará un movimiento de "Debe" por el <strong>total final</strong> vinculado a este pedido.
              </span>
            </label>
          </div>
      </div>
                    */}





      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button type="button" onClick={(e) => { e.preventDefault(); if (validate()) { handleSubmit(e, true); } }} disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center gap-2">
          {loading ? (<><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Procesando...</>) : (<>🖨️ Crear e Imprimir</>)}
        </button>
        <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-amber-500/30 flex items-center justify-center gap-2">
          {loading ? (<><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Creando...</>) : (<> <FaCheckCircle /> Crear Pedido</>)}
        </button>
        <Link href="/gestion/pedidos" className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl text-center transition-all duration-200 flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Cancelar
        </Link>
      </div>
    </form>
      </div >
    </div >
  );
}