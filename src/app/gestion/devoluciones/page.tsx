'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { FaBox, FaTruck, FaUser, FaTimes } from 'react-icons/fa';
import { ArrowLeft, History, Search } from 'lucide-react';
import Link from 'next/link';

interface Product {
  _id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  stock: Array<{ deposito: string; cantidad: number }>;
}

const motivosDisponibles = [
  'Vencimiento',
  'Producto dañado',
  'Error de pedido',
  'Cambio de opinión',
  'Devolución comercial',
  'Otro'
];

export default function DevolucionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Estados para productos y búsqueda
  const [products, setProducts] = useState<Product[]>([]);
  const [internalSearch, setInternalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchHint, setSearchHint] = useState<string | null>(null);

  // Estados del formulario
  const [tipo, setTipo] = useState<'cliente' | 'proveedor'>('cliente');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [motivo, setMotivo] = useState('Vencimiento');
  const [lote, setLote] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const productsToShow = internalSearch.trim() ? searchResults : products;

  // 🔒 Validación de acceso
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { 
      router.push('/'); 
      return; 
    }
    const token = session?.user?.token || localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (['admin', 'superadmin', 'vendedor'].includes(payload.role)) {
          setIsAuthorized(true);
        } else {
          router.push('/');
        }
      } catch { 
        router.push('/'); 
      }
    }
  }, [status, session, router]);

  // 📥 Cargar productos base
  useEffect(() => {
    if (!isAuthorized) return;
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/gestion/productos?all=true');
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (err) { 
        console.error('Error cargando productos', err); 
      }
    };
    fetchProducts();
  }, [isAuthorized]);

  /* =========================
     BÚSQUEDA CON DEBOUNCE
  ========================= */
  useEffect(() => {
    if (!internalSearch.trim()) {
      setSearchResults([]);
      setSearchHint(null);
      return;
    }

    if (internalSearch.trim().length < 2) {
      setSearchResults([]);
      setSearchHint('Escribe al menos 2 caracteres para buscar...');
      return;
    }

    const handler = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/gestion/productos/search?q=${encodeURIComponent(internalSearch.trim())}`
        );

        if (!res.ok) throw new Error('Error en la búsqueda');

        const data = await res.json();
        setSearchResults(data.products || []);
        setSearchHint(data.hint || null);
      } catch (err) {
        console.error('Error al buscar productos:', err);
        setSearchResults([]);
        setSearchHint('Error al realizar la búsqueda.');
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [internalSearch]);

  const handleSelectProduct = (product: Product) => {
    setProductoId(product._id);
    setInternalSearch('');
    setSearchResults([]);
    setSearchHint(null);
  };

  const handleClearProduct = () => {
    setProductoId('');
    setInternalSearch('');
    setSearchResults([]);
    setSearchHint(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoId || !cantidad || Number(cantidad) <= 0) {
      toast.error('Por favor, selecciona un producto y una cantidad válida.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/gestion/devoluciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          productoId,
          cantidad: Number(cantidad),
          motivo,
          lote: lote.trim() || undefined,
          notas: notas.trim() || undefined
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`✅ Devolución de ${tipo === 'cliente' ? 'cliente' : 'proveedor'} registrada.`);
        
        handleClearProduct();
        setCantidad('');
        setMotivo('Vencimiento');
        setLote('');
        setNotas('');
        
        window.dispatchEvent(new CustomEvent('stockSummaryReload'));
      } else {
        toast.error(data.error || data.message || 'Error al procesar la devolución.');
      }
    } catch (err) {
      console.error('Error de conexión:', err);
      toast.error('Error de conexión al procesar la devolución.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) return null;
  
  const selectedProduct = products.find(p => p._id === productoId);
  const stockActual = selectedProduct 
    ? selectedProduct.stock.reduce((acc, s) => acc + s.cantidad, 0) 
    : 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-gray-900 text-white">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/gestion" className="p-2 hover:bg-gray-800 rounded-full transition">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestión de Devoluciones</h1>
          <p className="text-gray-400 text-sm">Registra devoluciones y ajusta el inventario de forma rápida.</p>
        </div>
      </div>

      {/* Botón para ver el historial */}
        <div className="flex justify-end mb-6">
          <Link
            href="/gestion/devoluciones/historial"
            className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
          >
            <History size={18} /> Ver Historial de Devoluciones
          </Link>
        </div>
        
        <div className="w-full border-b border-gray-700 mb-8"></div>


      <div className="max-w-3xl mx-auto bg-gray-800 rounded-xl border border-gray-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Tipo de Devolución */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Devolución</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                type="button" 
                onClick={() => setTipo('cliente')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition ${
                  tipo === 'cliente' 
                    ? 'bg-green-900/30 border-green-500 text-green-400' 
                    : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                }`}
              >
                <FaUser /> Devolución de Cliente <span className="text-xs opacity-70">(Aumenta Stock)</span>
              </button>
              <button 
                type="button" 
                onClick={() => setTipo('proveedor')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition ${
                  tipo === 'proveedor' 
                    ? 'bg-red-900/30 border-red-500 text-red-400' 
                    : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                }`}
              >
                <FaTruck /> Devolución a Proveedor <span className="text-xs opacity-70">(Disminuye Stock)</span>
              </button>
            </div>
          </div>

          {/* Producto: Buscador con Debounce */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">Producto</label>
            
            {productoId ? (
              <div className="flex items-center justify-between p-3 bg-gray-900 border border-amber-500/50 rounded-lg text-white">
                <div>
                  <p className="font-semibold text-amber-400">
                    {selectedProduct?.nombre || 'Producto seleccionado'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Stock actual: {stockActual} {selectedProduct?.unidad}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearProduct}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm transition-colors"
                >
                  <FaTimes /> Cambiar
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={internalSearch}
                    onChange={(e) => setInternalSearch(e.target.value)}
                    placeholder="Escribe el nombre del producto..."
                    className="w-full p-3 pl-10 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    autoComplete="off"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                </div>
                
                {internalSearch.trim() && (
                  <div className="mt-2 text-xs min-h-[20px]">
                    {searching && (
                      <div className="text-gray-400 flex items-center gap-2">
                        <span className="animate-spin">⏳</span> Buscando...
                      </div>
                    )}
                    {!searching && searchHint && (
                      <span className="text-gray-500 italic">{searchHint}</span>
                    )}
                  </div>
                )}

                {internalSearch.trim().length >= 2 && !searching && productsToShow.length > 0 && (
                  <ul className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {productsToShow.map((p) => (
                      <li
                        key={p._id}
                        onClick={() => handleSelectProduct(p)}
                        className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition-colors"
                      >
                        <p className="text-white font-medium">{p.nombre}</p>
                        <p className="text-xs text-gray-400">
                          Stock: {p.stock.reduce((acc, s) => acc + s.cantidad, 0)} {p.unidad} | {p.categoria}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                
                {internalSearch.trim().length >= 2 && !searching && productsToShow.length === 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 text-center text-gray-400">
                    No se encontraron productos.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Cantidad</label>
            <input 
              type="number" 
              step="0.001" 
              min="0.001" 
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:outline-none" 
              placeholder="0.00" 
              required 
            />
          </div>

          {/* ✅ Motivo: Mejorado con botones "Chip" (Un solo clic, no se cierra) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Motivo</label>
            <div className="flex flex-wrap gap-2">
              {motivosDisponibles.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    motivo === m
                      ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/20'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Campo Lote (Condicional) */}
          {tipo === 'proveedor' && motivo === 'Vencimiento' && (
            <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-4">
              <label className="block text-sm font-medium text-red-300 mb-2">
                Código de Lote a retirar (Opcional)
              </label>
              <input 
                type="text" 
                value={lote} 
                onChange={(e) => setLote(e.target.value)}
                className="w-full p-3 bg-gray-900 border border-red-900/50 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="Ej: L-2023-001" 
              />
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <span>💡</span> Si se completa, este lote se eliminará del registro del producto.
              </p>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notas adicionales (Opcional)</label>
            <textarea 
              value={notas} 
              onChange={(e) => setNotas(e.target.value)} 
              rows={2}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              placeholder="Detalles extra..." 
            />
          </div>

          {/* Resumen dinámico */}
          {selectedProduct && cantidad && Number(cantidad) > 0 && (
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-300 leading-relaxed">
                <strong>Resumen:</strong> <br />
                Se <span className={tipo === 'cliente' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                  {tipo === 'cliente' ? 'agregarán' : 'descontarán'}
                </span>{' '}
                <span className="text-amber-400 font-bold text-base">{cantidad}</span> {selectedProduct.unidad}es de{' '}
                <span className="text-white font-semibold">{selectedProduct.nombre}</span>.
                <br />
                <span className="text-xs text-gray-500 mt-1 block">
                  Stock actual total: {stockActual} {selectedProduct.unidad}es
                </span>
              </p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !productoId}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin">⏳</span> Procesando...</>
            ) : (
              <><FaBox /> Registrar Devolución</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}