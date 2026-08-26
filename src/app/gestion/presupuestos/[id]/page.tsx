'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import {
  FaUser, FaArrowLeft, FaPrint, FaEdit, FaTrash,
  FaPlus, FaSearch, FaTimes, FaWeightHanging, FaDollarSign,
  FaCheck, FaFileInvoice
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import { formatARS } from '@/app/lib/formatcurrenci';

interface Cliente {
  _id: string; razonSocial: string; nombre: string; apellido: string;
  direccion?: string; telefono?: string;
}

interface ProductoPresupuesto {
  nombre: string; unidad: string; cantidad: number;
  precioAplicado: number; subtotal: number; producto?: string;
}

interface ProductoSimple {
  _id: string; nombre: string; unidad: string; precio: { mayorista: number; oferta: number; };
}

interface Presupuesto {
  _id: string; cliente: Cliente; productos: ProductoPresupuesto[];
  estado: 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'convertido';
  total: number; createdAt: string; notas?: string;
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', enviado: 'Enviado', aceptado: 'Aceptado',
  rechazado: 'Rechazado', convertido: 'Convertido',
};

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

const highlightMatch = (text: string, query: string) => {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-amber-500/30 text-amber-200 rounded px-0.5">{part}</mark> : part
  );
};

export default function DetallePresupuestoPage() {
  const isAuthorized = useAdminAuthorization();
  const { id } = useParams() as { id?: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);

  // Estados para edición de producto existente
  const [editandoProducto, setEditandoProducto] = useState<number | null>(null);
  const [cantidadTemporal, setCantidadTemporal] = useState<number>(1);
  const [precioTemporal, setPrecioTemporal] = useState<number>(0);

  // Estados para agregar nuevo producto
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoSimple[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [cantidadNuevo, setCantidadNuevo] = useState<number>(1);
  const [precioNuevo, setPrecioNuevo] = useState<number>(0);
  const [busquedaProducto, setBusquedaProducto] = useState<string>('');

  // Autocompletado
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchProductos = async () => {
    try {
      const res = await fetch('/api/gestion/productos/lista-simple');
      const data = await res.json();
      setProductosDisponibles(data);
    } catch (err) { console.error('Error cargando productos', err); }
  };

  useEffect(() => { fetchProductos(); }, []);

  const fetchPresupuestoData = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/gestion/presupuestos/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Presupuesto no encontrado');
      const data = await res.json();
      setPresupuesto(data);
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudo cargar el presupuesto', 'error');
      router.push('/gestion/presupuestos');
    }
  };

  useEffect(() => {
    if (!isAuthorized || !id) return;
    const init = async () => {
      await fetchPresupuestoData();
      setLoading(false);
    };
    init();
  }, [isAuthorized, id, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthorized) return null;
  if (loading) return <div className="p-8 text-center text-gray-400">Cargando presupuesto...</div>;
  if (!presupuesto) return null;

  const productosFiltrados = productosDisponibles.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase().trim())
  );
  const unidadSeleccionada = productoSeleccionado
    ? productosDisponibles.find(p => p._id === productoSeleccionado)?.unidad
    : null;

  const seleccionarProducto = (prod: ProductoSimple) => {
    setProductoSeleccionado(prod._id);
    setBusquedaProducto(prod.nombre);
    setDropdownAbierto(false);
    setIndiceActivo(-1);
    setCantidadNuevo(prod.unidad === 'kg' || prod.unidad === 'litro' ? 0.000 : 1);
    const precioBase = prod.precio.oferta && prod.precio.oferta < prod.precio.mayorista
      ? prod.precio.oferta
      : prod.precio.mayorista;
    setPrecioNuevo(precioBase);
  };

  const limpiarSeleccion = () => {
    setProductoSeleccionado('');
    setBusquedaProducto('');
    setPrecioNuevo(0);
    setCantidadNuevo(1);
    inputRef.current?.focus();
  };

  const handleAgregarProducto = async () => {
    if (!productoSeleccionado || cantidadNuevo <= 0 || isNaN(cantidadNuevo) || precioNuevo <= 0 || isNaN(precioNuevo)) {
      Swal.fire('Error', 'Selecciona un producto, cantidad y precio válidos', 'error'); return;
    }
    const cantidadValidada = parseFloat(cantidadNuevo.toFixed(3));
    try {
      const res = await fetch(`/api/gestion/presupuestos/${id}/producto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: productoSeleccionado,
          cantidad: cantidadValidada,
          precioPersonalizado: precioNuevo,
        }),
      });
      if (res.ok) {
        await fetchPresupuestoData();
        setMostrarAgregar(false);
        setProductoSeleccionado(''); setCantidadNuevo(1); setPrecioNuevo(0); setBusquedaProducto('');
        Swal.fire({ icon: 'success', title: '¡Agregado!', timer: 2000, showConfirmButton: false });
      } else { 
        const err = await res.json();
        Swal.fire('Error', err.error || 'No se pudo agregar', 'error'); 
      }
    } catch (err) { Swal.fire('Error', 'Error de conexión', 'error'); }
  };

  const iniciarEdicion = (idx: number, cantidad: number, precio: number) => {
    setEditandoProducto(idx); setCantidadTemporal(cantidad); setPrecioTemporal(precio);
  };

  const guardarCantidadYPrecio = async (idx: number) => {
    if (cantidadTemporal <= 0 || isNaN(cantidadTemporal) || precioTemporal <= 0 || isNaN(precioTemporal)) {
      Swal.fire('Error', 'La cantidad y el precio deben ser mayores a 0', 'error'); return;
    }
    const cantidadValidada = parseFloat(cantidadTemporal.toFixed(3));
    try {
      const res = await fetch(`/api/gestion/presupuestos/${id}/producto/${idx}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevaCantidad: cantidadValidada, nuevoPrecio: precioTemporal }),
      });
      if (res.ok) {
        await fetchPresupuestoData();
        setEditandoProducto(null);
        Swal.fire({ icon: 'success', title: '¡Actualizado!', timer: 2000, showConfirmButton: false });
      } else { 
        const err = await res.json();
        Swal.fire('Error', err.error || 'No se pudo actualizar', 'error'); 
      }
    } catch (err) { Swal.fire('Error', 'Error de conexión', 'error'); }
  };

  const eliminarProducto = async (idx: number, nombre: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar producto?', text: `¿Seguro que deseas eliminar "${nombre}" del presupuesto?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#d32f2f', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/gestion/presupuestos/${id}/producto/${idx}`, { method: 'DELETE' });
        if (res.ok) {
          await fetchPresupuestoData();
          Swal.fire('¡Eliminado!', 'El producto fue removido del presupuesto.', 'success');
        } else { 
          const err = await res.json();
          Swal.fire('Error', err.error || 'No se pudo eliminar', 'error'); 
        }
      } catch (err) { Swal.fire('Error', 'Error de conexión', 'error'); }
    }
  };

  // No permitir editar si ya fue convertido a pedido o rechazado
  const puedeEditar = presupuesto.estado !== 'convertido' && presupuesto.estado !== 'rechazado';

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/gestion/presupuestos" className="text-amber-500 hover:text-amber-400 flex items-center gap-1">
          <FaArrowLeft /> Volver a presupuestos
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Presupuesto #{presupuesto._id.slice(-6).toUpperCase()}</h1>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-4xl mx-auto">
        {/* Info Cliente y Estado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-750 p-4 rounded-lg">
            <h3 className="font-medium text-amber-400 mb-2 flex items-center gap-2"><FaUser /> Cliente</h3>
            <p className="text-white font-semibold">{presupuesto.cliente.razonSocial}</p>
            <p className="text-gray-300 text-sm">
              {presupuesto.cliente.nombre} {presupuesto.cliente.apellido} <br />
              {presupuesto.cliente.direccion} <br />
              {presupuesto.cliente.telefono}
            </p>
          </div>
          <div className="bg-gray-750 p-4 rounded-lg">
            <h3 className="font-medium text-amber-400 mb-2 flex items-center gap-2"><FaFileInvoice /> Estado</h3>
            <p className="text-white text-lg font-bold capitalize">{ESTADO_LABEL[presupuesto.estado] || presupuesto.estado}</p>
            <p className="text-gray-300 text-sm">Creado: {new Date(presupuesto.createdAt).toLocaleDateString('es-AR')}</p>
          </div>
        </div>

    

        {/* Botón y Formulario para Agregar Producto */}
        {puedeEditar && (
          <div className="mb-6">
            <button 
              onClick={() => {
                setMostrarAgregar(!mostrarAgregar);
                if (!mostrarAgregar) setTimeout(() => inputRef.current?.focus(), 50);
              }} 
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              <FaPlus size={12} /> Agregar producto al presupuesto
            </button>

            {mostrarAgregar && (
              <div className="mt-3 p-4 bg-gray-750 rounded-lg border border-gray-600">
                {/* Autocompletado de productos */}
                <div className="mb-3 relative" ref={dropdownRef}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Buscar y seleccionar producto</label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={busquedaProducto}
                      onChange={(e) => {
                        setBusquedaProducto(e.target.value);
                        setDropdownAbierto(true);
                        setIndiceActivo(-1);
                        if (productoSeleccionado) {
                          const prodActual = productosDisponibles.find(p => p._id === productoSeleccionado);
                          if (!prodActual || prodActual.nombre !== e.target.value) {
                            setProductoSeleccionado('');
                            setPrecioNuevo(0);
                          }
                        }
                      }}
                      onFocus={() => setDropdownAbierto(true)}
                      onKeyDown={(e) => {
                        if (!dropdownAbierto || productosFiltrados.length === 0) return;
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setIndiceActivo((prev) => prev < productosFiltrados.length - 1 ? prev + 1 : 0);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setIndiceActivo((prev) => prev > 0 ? prev - 1 : productosFiltrados.length - 1);
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (indiceActivo >= 0 && productosFiltrados[indiceActivo]) {
                            seleccionarProducto(productosFiltrados[indiceActivo]);
                          }
                        } else if (e.key === 'Escape') {
                          setDropdownAbierto(false);
                        }
                      }}
                      placeholder="Escribí para buscar (ej: harin, pan, fac...)"
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                      autoComplete="off"
                    />
                    {busquedaProducto && (
                      <button onClick={limpiarSeleccion} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition" title="Limpiar">
                        <FaTimes size={14} />
                      </button>
                    )}
                  </div>

                  {dropdownAbierto && (
                    <div className="absolute z-20 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-2xl shadow-black/50 max-h-72 overflow-y-auto">
                      {productosFiltrados.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {busquedaProducto.trim() ? 'Sin resultados para esta búsqueda' : 'Escribí al menos una letra para buscar'}
                        </div>
                      ) : (
                        <>
                          <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-700 sticky top-0 bg-gray-800">
                            {productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? 's' : ''}
                          </div>
                          {productosFiltrados.map((p, idx) => {
                            const precioMostrar = p.precio.oferta && p.precio.oferta < p.precio.mayorista ? p.precio.oferta : p.precio.mayorista;
                            const esActivo = idx === indiceActivo;
                            const estaSeleccionado = p._id === productoSeleccionado;
                            return (
                              <button
                                key={p._id}
                                type="button"
                                onClick={() => seleccionarProducto(p)}
                                onMouseEnter={() => setIndiceActivo(idx)}
                                className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition border-b border-gray-700/50 last:border-0
                                  ${esActivo ? 'bg-amber-600/20' : 'hover:bg-gray-700/50'}
                                  ${estaSeleccionado ? 'bg-emerald-900/20' : ''}
                                `}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-white text-sm font-medium truncate">
                                    {estaSeleccionado && <FaCheck className="inline text-emerald-400 mr-1.5" size={10} />}
                                    {highlightMatch(p.nombre, busquedaProducto)}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-0.5 capitalize">{p.unidad}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-amber-400 font-semibold text-sm whitespace-nowrap">{formatARS(precioMostrar)}</div>
                                </div>
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {productoSeleccionado && (
                  <div className="mb-3 p-2.5 bg-emerald-900/20 border border-emerald-700/50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FaCheck className="text-emerald-400 shrink-0" size={12} />
                      <div className="min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                          {productosDisponibles.find(p => p._id === productoSeleccionado)?.nombre}
                        </div>
                        <div className="text-xs text-gray-400">
                          Precio: <span className="text-amber-400 font-semibold">{formatARS(precioNuevo)}</span>
                          {unidadSeleccionada && <span className="ml-2">• {unidadSeleccionada}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={limpiarSeleccion} className="text-gray-400 hover:text-red-400 transition shrink-0 ml-2" title="Quitar selección">
                      <FaTimes size={14} />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                      <FaWeightHanging className="text-amber-400" /> Cantidad ({unidadSeleccionada || 'unidad'})
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCantidadNuevo(Math.max(0.001, parseFloat((cantidadNuevo - (unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? 0.1 : 1)).toFixed(3))))}
                        className="w-8 h-8 rounded bg-gray-600 text-white flex items-center justify-center hover:bg-gray-500 transition text-lg"
                      >–</button>
                      <input
                        type="number"
                        step={unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? "0.001" : "1"}
                        min="0.001"
                        value={cantidadNuevo}
                        onChange={(e) => { const val = parseFloat(e.target.value); if (!isNaN(val) && val > 0) setCantidadNuevo(val); }}
                        className="flex-1 text-center bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 py-1.5 text-lg font-mono"
                      />
                      <button
                        onClick={() => setCantidadNuevo(parseFloat((cantidadNuevo + (unidadSeleccionada === 'kg' || unidadSeleccionada === 'litro' ? 0.1 : 1)).toFixed(3)))}
                        className="w-8 h-8 rounded bg-gray-600 text-white flex items-center justify-center hover:bg-gray-500 transition text-lg"
                      >+</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                      <FaDollarSign className="text-amber-400" /> Precio unitario
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={precioNuevo}
                        onChange={(e) => { const val = parseFloat(e.target.value); if (!isNaN(val) && val >= 0) setPrecioNuevo(val); }}
                        className="flex-1 text-center bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 py-1.5 text-lg font-mono"
                      />
                    </div>
                  </div>
                </div>

                {productoSeleccionado && cantidadNuevo > 0 && precioNuevo > 0 && (
                  <div className="mb-3 p-2.5 bg-gray-700/50 rounded-lg flex justify-between items-center">
                    <span className="text-sm text-gray-400">Subtotal estimado:</span>
                    <span className="text-lg font-bold text-amber-400">{formatARS(cantidadNuevo * precioNuevo)}</span>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-3 border-t border-gray-600">
                  <button
                    onClick={() => {
                      setMostrarAgregar(false);
                      setProductoSeleccionado(''); setCantidadNuevo(1); setPrecioNuevo(0); setBusquedaProducto('');
                      setDropdownAbierto(false);
                    }}
                    className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded hover:bg-gray-600 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAgregarProducto}
                    disabled={!productoSeleccionado || cantidadNuevo <= 0 || precioNuevo <= 0}
                    className={`px-4 py-2 rounded transition flex items-center gap-1
                      ${productoSeleccionado && cantidadNuevo > 0 && precioNuevo > 0
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                  >
                    <FaPlus /> Agregar al presupuesto
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lista de Productos */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-amber-400 mb-3">Productos</h3>
          {presupuesto.productos.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No hay productos en este presupuesto aún.</p>
          ) : (
            <div className="space-y-3">
              {presupuesto.productos.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                  <div>
                    <div className="text-white">{p.nombre}</div>
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
                        <button onClick={() => guardarCantidadYPrecio(idx)} className="text-green-500 hover:text-green-400 text-sm font-medium flex items-center gap-1"><FaCheck size={14} /> Guardar</button>
                        <button onClick={() => setEditandoProducto(null)} className="text-gray-500 hover:text-gray-400 text-sm">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="text-right min-w-[200px]">
                          <div className="text-white font-medium">{formatCantidad(p.cantidad, p.unidad)} {getUnidadTexto(p.cantidad, p.unidad)}</div>
                          <div className="text-xs text-gray-400">{formatARS(p.precioAplicado)} c/u • {formatARS(p.subtotal)} total</div>
                        </div>
                        {puedeEditar && (
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
          )}
        </div>

        {/* Total y Acciones */}
        <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
          <div>
            {presupuesto.notas && <div className="text-sm text-gray-400 mb-2"><strong>Notas:</strong> {presupuesto.notas}</div>}
          </div>
          <div className="text-right">
            <div className="text-gray-400">Total Presupuesto</div>
            <div className="text-2xl font-bold text-white">{formatARS(presupuesto.total)}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-gray-700">
          <Link href={`/gestion/presupuestos/imprimir/${presupuesto._id}`} className="flex-1 text-center bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition">
            <FaPrint /> Imprimir / convertir en pedido
          </Link>
        </div>
      </div>
    </div>
  );
}