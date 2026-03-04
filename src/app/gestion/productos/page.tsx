'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { FaBox, FaPlus } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { Suspense } from 'react';
import StockValueSummary from './StockValueSummary';
import { formatARS } from '@/app/lib/formatcurrenci';
import { Pencil, Trash2, Truck } from 'lucide-react';

interface Proveedor {
  _id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
}

interface Product {
  _id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidadUnidad: number;
  precioLista: number;
  precioMayorista: number;
  precioOferta: number;
  stock: Array<{ deposito: string; cantidad: number }>;
  lotes: Array<{ lote: string; vencimiento: string; cantidad: number; deposito: string }>;
  activo: boolean;
  stockReservado: number;
  imagen?: string;
  createdAt: string;
  stockMinimoAlerta?: number;
  proveedor?: Proveedor | null;
}

interface ProductResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export default function ProductosPage() {
  return (
    <Suspense fallback={<div className="text-gray-400">Cargando...</div>}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [products, setProducts] = useState<Product[]>([]); // productos de la página actual
  const [loading, setLoading] = useState(true);

  /* =========================
     BÚSQUEDA CON DEBOUNCE (API)
  ========================= */
  const [internalSearch, setInternalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchHint, setSearchHint] = useState<string | null>(null);

  // Determinar qué productos mostrar
  const productsToShow = internalSearch.trim() ? searchResults : products;

  // Estados para UI condicional
  const shouldShowEmptyState =
    !loading &&
    !searching &&
    internalSearch.trim().length >= 2 &&
    productsToShow.length === 0;

  const shouldShowTable =
    !loading &&
    (internalSearch.trim().length < 2 || productsToShow.length > 0);

  /* =========================
     EFFECT: BÚSQUEDA CON DEBOUNCE
  ========================= */
  useEffect(() => {
    // Limpiar resultados si no hay búsqueda
    if (!internalSearch.trim()) {
      setSearchResults([]);
      setSearchHint(null);
      return;
    }

    // Solo buscar si hay al menos 2 caracteres
    if (internalSearch.trim().length < 2) {
      setSearchResults([]);
      setSearchHint('Escribe al menos 2 caracteres para buscar...');
      return;
    }

    // Debounce de 350ms
    const handler = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/gestion/productos/search?q=${encodeURIComponent(internalSearch.trim())}`
        );

        if (!res.ok) {
          throw new Error('Error en la búsqueda');
        }

        const data = await res.json();
        setSearchResults(data.products || []);
        setSearchHint(data.hint || null);
      } catch (err) {
        console.error('Error al buscar productos:', err);
        setSearchResults([]);
        setSearchHint('Error al realizar la búsqueda. Intenta nuevamente.');
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [internalSearch]);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });

  const limit = 20;
  const [selectedProductForProveedor, setSelectedProductForProveedor] = useState<Product | null>(null);
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [selectedProveedorId, setSelectedProveedorId] = useState<string | null>(null);
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState('');
  const [nuevoProveedorTelefono, setNuevoProveedorTelefono] = useState('');
  const [nuevoProveedorEmail, setNuevoProveedorEmail] = useState('');
  const [isEditingProveedor, setIsEditingProveedor] = useState(false);

  const resetProveedorForm = () => {
    setNuevoProveedorNombre('');
    setNuevoProveedorTelefono('');
    setNuevoProveedorEmail('');
    setSelectedProveedorId(null);
  };

  // 🔒 Validación de acceso
  useEffect(() => {
    const validateAccess = async () => {
      if (status === 'loading') return;
      if (status === 'unauthenticated') {
        router.push('/');
        return;
      }
      const token = session?.user?.token || localStorage.getItem('token');
      if (!token) {
        toast.error('Acceso denegado');
        router.push('/');
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!['admin', 'superadmin'].includes(payload.role)) {
          toast.error('Acceso restringido a administradores');
          router.push('/');
          return;
        }
        setIsAuthorized(true);
      } catch (err) {
        toast.error('Sesión inválida');
        router.push('/');
      }
    };
    validateAccess();
  }, [status, session, router]);

  // 📥 Cargar productos PAGINADOS (para la tabla principal)
  const loadPaginatedProducts = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/gestion/productos?page=${currentPage}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setPagination({
          total: data.total,
          page: data.page,
          totalPages: data.totalPages,
        });
      } else {
        toast.error('Error al cargar productos');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaginatedProducts();
  }, [currentPage, isAuthorized]);

  // ✨✨✨ SSE: Escuchar eventos de producto en tiempo real ✨✨✨
  useEffect(() => {
    const eventSource = new EventSource('/api/gestion/productos/events');
    eventSource.onmessage = (event) => {
      if (!event.data || event.data === 'ping') return;
      try {
        const parsed = JSON.parse(event.data);
        // ➤ Producto creado
        if (parsed.type === 'producto_creado') {
          setProducts(prev => [...prev, parsed.data]);
          // Si hay búsqueda activa, actualizar también los resultados
          if (internalSearch.trim()) {
            setSearchResults(prev => [...prev, parsed.data]);
          }
          toast.success('Producto creado correctamente');
        }
        // ➤ Producto actualizado
        if (
          parsed.type === 'producto_actualizado' ||
          parsed.type === 'stock_modificado' ||
          parsed.type === 'stock_reservado'
        ) {
          const updatedProduct = parsed.data.producto || parsed.data;
          setProducts(prev =>
            prev.map(p => p._id === updatedProduct._id ? { ...p, ...updatedProduct } : p)
          );
          // Actualizar resultados de búsqueda si existen
          if (internalSearch.trim()) {
            setSearchResults(prev =>
              prev.map(p => p._id === updatedProduct._id ? { ...p, ...updatedProduct } : p)
            );
          }
        }
        // ➤ Producto eliminado
        if (parsed.type === 'producto_eliminado') {
          const productId = parsed.data._id;
          setProducts(prev => prev.filter(p => p._id !== productId));
          // Eliminar de resultados de búsqueda si existen
          if (internalSearch.trim()) {
            setSearchResults(prev => prev.filter(p => p._id !== productId));
          }
          toast.info('Producto eliminado', { autoClose: 3000 });
          window.dispatchEvent(new CustomEvent('stockSummaryReload'));
        }
      } catch (err) {
        console.error('Error al procesar evento SSE:', event.data, err);
      }
    };
    eventSource.onerror = () => {
      console.warn('Conexión SSE perdida');
      eventSource.close();
    };
    return () => eventSource.close();
  }, [internalSearch]);

  if (!isAuthorized) return null;

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    return `${pathname}?${params.toString()}`;
  };

  /* =========================
     Delete 
  ========================= */


  const deleteProduct = async (id: string) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await fetch(`/api/gestion/productos/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          toast.success('Producto eliminado');
          setProducts(prev => prev.filter(p => p._id !== id));
          if (internalSearch.trim()) {
            setSearchResults(prev => prev.filter(p => p._id !== id));
          }
        } else {
          toast.error('Error al eliminar');
        }
      }
    });
  };

  /* =========================
   Formatear cantidad unidad
========================= */

  function formatCantidadUnidad(cantidad: number, unidad: string): string {
    if (unidad === 'kg') {
      if (cantidad >= 1) return `${cantidad} kg`;
      const gramos = Math.round(cantidad * 1000);
      return `${gramos} g`;
    } else if (unidad === 'litro') {
      if (cantidad >= 1) return `${cantidad} L`;
      const mililitros = Math.round(cantidad * 1000);
      return `${mililitros} ml`;
    } else {
      const label = unidad === 'unidad' ? 'unid.' : unidad;
      return `${cantidad} ${label}`;
    }
  }

  const getStockTotal = (product: any) => {
    if (Array.isArray(product.stock)) {
      return product.stock.reduce(
        (sum: number, s: any) => sum + (s.cantidad || 0),
        0
      );
    }
    return product.stock || 0;
  };

  /* =========================
   Llevar stock a cero
========================= */

  const getStockReservado = (product: any) =>
    product.stockReservado || 0;

  const getStockDisponible = (product: any) =>
    getStockTotal(product) - getStockReservado(product);

  const loadProveedores = async () => {
    setLoadingProveedores(true);
    try {
      const res = await fetch('/api/gestion/proveedores?limit=100');
      if (!res.ok) {
        throw new Error('Error HTTP');
      }
      const data = await res.json();
      if (Array.isArray(data.proveedores)) {
        setProveedores(data.proveedores);
      } else {
        console.error('Respuesta inesperada:', data);
        setProveedores([]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar proveedores');
      setProveedores([]);
    } finally {
      setLoadingProveedores(false);
    }
  };


  // ===============================


  const resetStockToZero = async (product: Product) => {
    Swal.fire({
      title: '¿Resetear stock a cero?',
      html: `<p class="text-left">Se pondrá en <strong>0</strong> el stock del producto <strong>"${product.nombre}"</strong> <br /> <br /> <strong>luego para incorporar stock nuevo ir a editar y agregar cantidad</strong></p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, resetear a cero',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // ✅ Estructura CORRECTA para resetear stock
          const updatePayload = {
            stock: product.stock.map((s: any) => ({
              deposito: s.deposito,
              cantidad: 0  // ← CERO aquí
            })),
            lotes: [],              // ← Limpiar lotes
            stockReservado: 0       // ← Resetear reservas
          };

          console.log('Payload enviado:', updatePayload); // 🔍 Debug

          const res = await fetch(`/api/gestion/productos/${product._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload),
          });

          if (res.ok) {
            const updatedProduct = await res.json();

            // Actualizar UI localmente
            setProducts(prev =>
              prev.map(p => p._id === product._id ? updatedProduct : p)
            );

            if (internalSearch.trim()) {
              setSearchResults(prev =>
                prev.map(p => p._id === product._id ? updatedProduct : p)
              );
            }

            // Recargar resumen de stock
            window.dispatchEvent(new CustomEvent('stockSummaryReload'));

            toast.success(`Stock de "${product.nombre}" reseteado a cero`);
          } else {
            const errorData = await res.json().catch(() => null);
            console.error('Error API:', errorData || res.statusText);
            toast.error(`Error al resetear stock: ${errorData?.message || 'Respuesta inválida del servidor'}`);
          }
        } catch (err) {
          console.error('Error al resetear stock:', err);
          toast.error('Error de conexión con el servidor');
        }
      }
    });
  };

  //    custom reset stock

  // ✅ Opción personalizada: Resetear stock a una cantidad definida por el admin
  const resetStockToCustom = async (product: Product) => {
    // 🔹 Paso 1: Mostrar modal con input para ingresar la nueva cantidad
    const { value: nuevaCantidad } = await Swal.fire({
      title: '🔄 Resetear stock',
      html: `
      <div class="text-left">
        <p class="mb-3">
          Producto: <strong class="text-[#0D4A6B]">${product.nombre}</strong><br/>
          Stock actual: <strong>${product.stock.reduce((acc: number, s: any) => acc + s.cantidad, 0)} unidades</strong>
        </p>
        
        <label for="stockCantidad" class="swal2-input" style="width:100%;text-align:left;font-weight:500;margin-bottom:8px">
          ¿A qué cantidad querés resetear el stock?
        </label>
        
        <input 
          id="stockCantidad" 
          type="number" 
          class="swal2-input" 
          placeholder="Ej: 50" 
          min="0" 
          step="1"
          value="0"
          style="width:100%;margin:0 auto;"
        >
        
        <p class="text-xs text-gray-500 mt-3" style="text-align:left">
          ⚠️ Esta acción reemplazará el stock en <strong>todos los depósitos</strong> por el valor ingresado.
        </p>
      </div>
    `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#0D4A6B',
      cancelButtonColor: '#6b7280',
      confirmButtonText: '✅ Actualizar stock',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const input = document.getElementById('stockCantidad') as HTMLInputElement;
        const valor = parseInt(input?.value, 10);

        if (isNaN(valor) || valor < 0) {
          Swal.showValidationMessage('⚠️ Ingresá un número válido mayor o igual a 0');
          return false;
        }
        return valor;
      },
      allowOutsideClick: () => !Swal.isLoading()
    });

    // Si el usuario cancela o no ingresa un valor válido
    if (nuevaCantidad === undefined || nuevaCantidad === null) return;

    // 🔹 Paso 2: Confirmación final antes de ejecutar (doble check para seguridad)
    const stockActual = product.stock.reduce((acc: number, s: any) => acc + s.cantidad, 0);

    const { isConfirmed } = await Swal.fire({
      title: '¿Confirmar cambios?',
      html: `
      <div class="text-left">
        <p class="mb-2">
          <strong>Producto:</strong> ${product.nombre}<br/><br/>
          📉 Stock actual: <strong class="text-gray-600">${stockActual}</strong><br/>
          📈 Nuevo stock: <strong class="text-[#0D4A6B] text-lg">${nuevaCantidad}</strong> en todos los depósitos
        </p>
        <div class="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
          <strong>⚠️ Esta acción:</strong><br/>
          • Reemplazará el stock en todos los depósitos<br/>
          • Eliminará todos los lotes existentes<br/>
          • Reseteará el stock reservado a 0<br/>
          • No se puede deshacer
        </div>
      </div>
    `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0D4A6B',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, aplicar cambios',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (!isConfirmed) return;

    // 🔹 Paso 3: Ejecutar el reseteo con la cantidad personalizada
    try {
      // ✅ Estructura del payload para actualizar stock
      const updatePayload = {
        stock: product.stock.map((s: any) => ({
          deposito: s.deposito,
          cantidad: nuevaCantidad  // ← Cantidad definida por el admin
        })),
        lotes: [],              // ← Limpiar historial de lotes
        stockReservado: 0       // ← Resetear reservas pendientes
      };

      console.log('📤 Payload enviado:', updatePayload);

      const res = await fetch(`/api/gestion/productos/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (res.ok) {
        const updatedProduct = await res.json();

        // 🔄 Actualizar estado local de productos
        setProducts(prev =>
          prev.map(p => p._id === product._id ? updatedProduct : p)
        );

        // 🔄 Actualizar resultados de búsqueda si hay filtro activo
        if (internalSearch?.trim()) {
          setSearchResults(prev =>
            prev.map(p => p._id === product._id ? updatedProduct : p)
          );
        }

        // 🔔 Notificar a otros componentes que recarguen el resumen de stock
        window.dispatchEvent(new CustomEvent('stockSummaryReload'));

        toast.success(`✅ Stock de "${product.nombre}" actualizado a ${nuevaCantidad} unidades`);
      } else {
        const errorData = await res.json().catch(() => null);
        console.error('❌ Error API:', errorData || res.statusText);
        toast.error(`Error al actualizar: ${errorData?.message || 'Respuesta inválida del servidor'}`);
      }
    } catch (err) {
      console.error('❌ Error de conexión:', err);
      toast.error('Error de conexión con el servidor. Intentá nuevamente.');
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Gestión de Productos</h1>
            <p className="text-gray-400 mt-1">
              Administra nombres, categorías, stock, lotes y vencimientos.
            </p>
            <p className="text-gray-400 mt-1">
              volver a la sección de <a href="/gestion" className="text-amber-400 underline">Gestión</a>.
            </p>
          </div>
          <Link
            href="/gestion/productos/nuevo"
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <FaPlus /> Nuevo Producto
          </Link>
        </div>

        {/* ✅ BUSCADOR CON DEBOUNCE */}
        <div className="mb-4">
          <input
            type="text"
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            placeholder="Buscar en todos los productos (uso interno)..."
            className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* ✅ FEEDBACK DE BÚSQUEDA */}
        {internalSearch.trim() && (
          <div className="mb-4 text-sm">
            {searching && (
              <div className="text-gray-400 flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                <span>Buscando...</span>
              </div>
            )}
            {!searching && searchHint && (
              <span className="text-gray-500 italic">{searchHint}</span>
            )}
            {!searching && !searchHint && productsToShow.length === 0 && (
              <span className="text-amber-400">
                No se encontraron productos para "{internalSearch}"
              </span>
            )}
            {!searching && productsToShow.length > 0 && (
              <span className="text-amber-400">
                Mostrando {productsToShow.length} resultado{productsToShow.length !== 1 ? 's' : ''} para "{internalSearch}"
              </span>
            )}
          </div>
        )}

        {/* ✅ RENDER CONDICIONAL */}
        {loading && !internalSearch.trim() ? (
          <div className="text-gray-400">Cargando productos...</div>
        ) : shouldShowEmptyState ? (
          <div className="text-center py-12 text-gray-500">
            <FaBox className="text-4xl mb-3 mx-auto text-amber-900/30" />
            <p>No se encontraron productos para "{internalSearch}"</p>
          </div>
        ) : shouldShowTable ? (
          <>
            {/* ✅ Leyenda con total de productos (solo cuando no hay búsqueda) */}
            {!internalSearch.trim() && (
              <div className="mb-4 text-sm text-gray-400">
                Total de productos registrados: <span className="font-semibold text-white">{pagination.total}</span>
              </div>
            )}

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900 text-gray-300">
                    <tr>
                      <th className="text-left py-3 px-4">Imagen</th>
                      <th className="text-left py-3 px-4">Producto</th>
                      <th className="text-left py-3 px-4">Categoría</th>
                      <th className="text-left py-3 px-4">Unidad</th>
                      <th className="text-left py-3 px-4">Precio de Lista</th>
                      <th className="text-left py-3 px-4">Precio Mayorista</th>
                      <th className="text-left py-3 px-4">Precio Oferta</th>
                      <th className="text-left py-3 px-4">Stock Total</th>
                      <th className="text-left py-3 px-4">Activo</th>
                      <th className="text-left py-3 px-4">Proveedor</th>
                      <th className="text-left py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {productsToShow.map((product) => {
                      const stockTotal = getStockTotal(product);
                      return (
                        <tr key={product._id} className="hover:bg-gray-750 transition">
                          <td className="py-3 px-4">
                            {product.imagen ? (
                              <img
                                src={product.imagen}
                                alt={product.nombre}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center text-gray-400">
                                <FaBox className="text-xs" />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-white">
                            {product.nombre} <span>{formatCantidadUnidad(product.cantidadUnidad, product.unidad)}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{product.categoria}</td>
                          <td className="py-3 px-4 text-gray-300">{product.unidad}</td>
                          <td className="py-3 px-4">
                            <div className="text-amber-400 font-medium">
                              ${product.precioLista.toLocaleString('es-AR')}
                              <span className="text-xs text-gray-400 ml-1">c/u</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Total invertido: {product.precioLista * stockTotal > 0
                                ? (formatARS(product.precioLista * stockTotal))
                                : '0'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-amber-400 font-medium">
                              {(formatARS(product.precioMayorista))}
                              <span className="text-xs text-gray-400 ml-1">c/u</span>
                            </div>
                            {stockTotal > 0 ? (
                              <div className="mt-1 text-xs space-y-1">
                                <div className="text-gray-300">
                                  Ingreso total: <span className="font-medium">{(formatARS(product.precioMayorista * stockTotal))}
                                  </span>
                                </div>
                                <div className="text-green-400">
                                  Ganancia potencial: <span className="font-medium">{(formatARS((product.precioMayorista - product.precioLista) * stockTotal))}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600 italic mt-1">Sin stock</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {/* Precio de venta / Oferta */}
                            <div className="flex items-baseline gap-1">
                              {product.precioOferta === product.precioMayorista ? (
                                <span className="text-gray-400 text-sm">Sin oferta</span>
                              ) : (
                                <>
                                  <span className="text-amber-400 font-bold">
                                    {(formatARS(product.precioOferta))}
                                  </span>
                                  <span className="text-xs text-green-400 font-medium bg-green-900/20 px-1.5 py-0.5 rounded">
                                    OFERTA
                                  </span>
                                </>
                              )}
                              <span className="text-xs text-gray-500 ml-1">c/u</span>
                            </div>
                            {/* Cálculos (siempre usan precioOferta, que es numérico) */}
                            {stockTotal > 0 ? (
                              <div className="mt-2 text-xs space-y-1">
                                <div className="text-gray-300">
                                  Ingreso total: <span className="font-medium text-amber-300">{(formatARS(product.precioOferta * stockTotal))}
                                  </span>
                                </div>
                                <div className="text-green-400">
                                  Ganancia potencial: <span className="font-medium">{(formatARS((product.precioOferta - product.precioLista) * stockTotal))}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600 italic mt-2">Sin stock</div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {/* STOCK TOTAL (lo que ya tenías) */}
                            <div
                              className={`font-medium ${stockTotal <= (product.stockMinimoAlerta ?? 0)
                                ? 'text-red-400'
                                : 'text-white'
                                }`}
                            >
                              Total: {stockTotal}
                              {stockTotal <= (product.stockMinimoAlerta ?? 0) && (
                                <span className="ml-1 text-xs text-red-400">⚠️ Bajo stock</span>
                              )}
                            </div>
                            {/* STOCK RESERVADO */}
                            {product.stockReservado > 0 && (
                              <div className="text-xs text-amber-400 mt-0.5">
                                Reservado: {product.stockReservado}
                              </div>
                            )}
                            {/* STOCK DISPONIBLE */}
                            <div className="text-sm font-semibold text-green-400">
                              Disponible: {getStockDisponible(product)}
                            </div>
                            {/* ALERTA MÍNIMA (no se toca nada) */}
                            <div className="mt-1 flex items-center gap-1">
                              <label
                                htmlFor={`alerta-${product._id}`}
                                className="text-[10px] text-gray-400 whitespace-nowrap"
                              >
                                Alerta:
                              </label>
                              <input
                                id={`alerta-${product._id}`}
                                type="number"
                                min="0"
                                value={product.stockMinimoAlerta != null ? product.stockMinimoAlerta : ''}
                                onChange={async (e) => {
                                  const rawValue = e.target.value;
                                  const newAlertValue =
                                    rawValue === '' ? undefined : Number(rawValue);
                                  const res = await fetch(
                                    `/api/gestion/productos/${product._id}`,
                                    {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ stockMinimoAlerta: newAlertValue }),
                                    }
                                  );
                                  if (res.ok) {
                                    const updatedProduct = await res.json();
                                    setProducts((prev) =>
                                      prev.map((p) =>
                                        p._id === product._id ? updatedProduct : p
                                      )
                                    );
                                    if (internalSearch.trim()) {
                                      setSearchResults((prev) =>
                                        prev.map((p) =>
                                          p._id === product._id ? updatedProduct : p
                                        )
                                      );
                                    }
                                  } else {
                                    toast.error('Error al guardar umbral');
                                  }
                                }}
                                className="w-16 text-xs bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                placeholder="0"
                              />
                            </div>

                            {/* 👇 NUEVO BOTÓN: Resetear Stock */}
                            <div className="relative group">
                              <button
                                className="text-purple-500 hover:text-purple-700 transition-colors focus:outline-none flex items-center gap-1"
                                aria-label="Opciones de stock"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 16v-4a2 2 0 0 0-2-2H7" />
                                  <path d="M3 12l4-4 4 4" />
                                  <rect x="3" y="16" width="18" height="4" rx="1" />
                                </svg>
                                <span className="text-[10px] font-medium hidden xl:inline">Stock</span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>

                              {/* Dropdown */}
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
                                <button
                                  onClick={() => resetStockToZero(product)}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                                >
                                  <span className="text-purple-500">🗑️</span> Resetear a Cero
                                </button>
                                <button
                                  onClick={() => resetStockToCustom(product)}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                                >
                                  <span className="text-blue-500">✏️</span> Cantidad personalizada...
                                </button>
                              </div>
                            </div>


                          </td>
                          <td className="py-3 px-4">
                            {product.activo ? (
                              <span className="text-green-500 font-semibold">Sí</span>
                            ) : (
                              <span className="text-red-500 font-semibold">No</span>
                            )}
                            <label className="flex items-center gap-2 mt-3">
                              <input
                                type="checkbox"
                                checked={product.activo}
                                onChange={async (e) => {
                                  const res = await fetch(`/api/gestion/productos/${product._id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ activo: e.target.checked }),
                                  });
                                  if (res.ok) {
                                    const updated = await res.json();
                                    setProducts(prev => prev.map(p => p._id === product._id ? updated : p));
                                    if (internalSearch.trim()) {
                                      setSearchResults(prev => prev.map(p => p._id === product._id ? updated : p));
                                    }
                                  } else {
                                    toast.error('Error al actualizar');
                                  }
                                }}
                              />
                              <span className="text-white">Activo</span>
                            </label>
                          </td>


                          <td className="py-3 px-4 text-gray-300">
                            {product.proveedor?.nombre || (
                              <span className="text-gray-500 italic">—</span>
                            )}
                            <br />
                            {product.proveedor?.telefono || (
                              <span className="text-gray-500 italic">—</span>
                            )}
                            <br />
                            {product.proveedor?.email || (
                              <span className="text-gray-500 italic">—</span>
                            )}
                          </td>


                          <td className="py-3 px-4 flex gap-2">
                            <div className="relative group">
                              <Link
                                href={`/gestion/productos/editar/${product._id}`}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                aria-label="Editar producto"
                              >
                                <Pencil size={18} />
                              </Link>
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Editar
                              </span>
                            </div>
                            <div className="relative group">
                              <button
                                onClick={() => deleteProduct(product._id)}
                                className="text-red-500 hover:text-red-700 transition-colors focus:outline-none"
                                aria-label="Borrar producto"
                              >
                                <Trash2 size={18} />
                              </button>
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Borrar
                              </span>
                            </div>
                            <div className="relative group">
                              <button
                                onClick={() => {
                                  const currentProveedorId =
                                    typeof product.proveedor === 'string'
                                      ? product.proveedor
                                      : product.proveedor?._id || null;
                                  setSelectedProductForProveedor(product);
                                  setSelectedProveedorId(currentProveedorId);
                                  setNuevoProveedorNombre('');
                                  setShowProveedorModal(true);
                                  loadProveedores();
                                }}
                                className="text-amber-500 hover:text-amber-700 transition-colors focus:outline-none"
                                aria-label="Asignar o editar proveedor"
                              >
                                <Truck size={18} />
                              </button>
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Proveedor
                              </span>
                            </div>






                          </td>


                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>


            <br />
            {/* ✅ Tabla de lotes: siempre usa la lista PAGINADA (products) */}
            {!internalSearch.trim() && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900 text-gray-300">
                      <tr>
                        <th className="text-left py-3 px-4">Lotes</th>
                        <th className="text-left py-3 px-4">Depósito</th>
                        <th className="text-left py-3 px-4">Cantidad</th>
                        <th className="text-left py-3 px-4">Vencimiento</th>
                        <th className="text-left py-3 px-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {products.flatMap((product) =>
                        product.lotes.map((lote, index) => (
                          <tr key={`${product._id}-lote-${index}`} className="hover:bg-gray-750 transition">
                            <td className="py-3 px-4 text-white">{product.nombre}</td>
                            <td className="py-3 px-4 text-gray-300">{lote.deposito}</td>
                            <td className="py-3 px-4 text-white">{lote.cantidad}</td>
                            <td className="py-3 px-4 text-gray-300">
                              {new Date(lote.vencimiento).toLocaleDateString('es-AR')}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={async () => {
                                  const updatedLotes = product.lotes.filter((_, i) => i !== index);
                                  const res = await fetch(`/api/gestion/productos/${product._id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ lotes: updatedLotes }),
                                  });
                                  if (res.ok) {
                                    const updated = await res.json();
                                    setProducts(prev => prev.map(p => p._id === product._id ? updated : p));
                                  } else {
                                    toast.error('Error al eliminar lote');
                                  }
                                }}
                                className="text-red-400 hover:underline"
                              >
                                Borrar Lote
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ✅ Paginación SOLO si no hay búsqueda activa */}
            {!internalSearch.trim() && pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                <div className="text-sm text-gray-500">
                  Mostrando {(currentPage - 1) * limit + 1}–
                  {Math.min(currentPage * limit, pagination.total)} de {pagination.total} productos
                </div>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <Link href={buildUrl(currentPage - 1)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition">
                      Anterior
                    </Link>
                  )}
                  <span className="px-3 py-1 text-gray-300">
                    Página {currentPage} de {pagination.totalPages}
                  </span>
                  {currentPage < pagination.totalPages && (
                    <Link href={buildUrl(currentPage + 1)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition">
                      Siguiente
                    </Link>
                  )}
                </div>
              </div>
            )}

            <br />
            <StockValueSummary />
          </>
        ) : null}
      </div>

      {/* 👇 MODAL DE PROVEEDOR */}
      {showProveedorModal && selectedProductForProveedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 text-white">
            <h3 className="text-xl font-bold mb-4">Asignar proveedor a: {selectedProductForProveedor.nombre}</h3>
            {loadingProveedores ? (
              <p className="text-gray-400">Cargando proveedores...</p>
            ) : (
              <>
                {/* Selección de proveedor existente */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-1">Proveedor existente</label>
                  <select
                    value={selectedProveedorId || ''}
                    onChange={(e) => {
                      const proveedorId = e.target.value || null;
                      setSelectedProveedorId(proveedorId);
                      setIsEditingProveedor(false);
                      if (proveedorId) {
                        const prov = proveedores.find((p) => p._id === proveedorId);
                        if (prov) {
                          setNuevoProveedorNombre(prov.nombre || '');
                          setNuevoProveedorTelefono(prov.telefono || '');
                          setNuevoProveedorEmail(prov.email || '');
                          setIsEditingProveedor(true); // 👈 entra en modo edición
                        }
                      } else {
                        resetProveedorForm();
                      }
                    }}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="">— Seleccionar —</option>
                    {proveedores.map((prov) => (
                      <option key={prov._id} value={prov._id}>
                        {prov.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                {/* O crear nuevo */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-1">
                    ¿O crear nuevo?
                  </label>
                  {/* Nombre */}
                  <input
                    type="text"
                    placeholder="Nombre del proveedor *"
                    value={nuevoProveedorNombre}
                    onChange={(e) => {
                      setNuevoProveedorNombre(e.target.value);
                      setSelectedProveedorId(null);
                    }}
                    className="w-full p-2 mb-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                  {/* Teléfono */}
                  <input
                    type="text"
                    placeholder="Teléfono"
                    value={nuevoProveedorTelefono}
                    onChange={(e) => setNuevoProveedorTelefono(e.target.value)}
                    className="w-full p-2 mb-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                  {/* Email */}
                  <input
                    type="email"
                    placeholder="Email"
                    value={nuevoProveedorEmail}
                    onChange={(e) => setNuevoProveedorEmail(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                {/* Botones */}
                <div className="flex gap-3 justify-end mt-4">
                  <button
                    onClick={() => {
                      resetProveedorForm();
                      setShowProveedorModal(false);
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      let proveedorIdToAssign = selectedProveedorId;
                      // 👇 SI ESTÁ EDITANDO UN PROVEEDOR EXISTENTE
                      if (isEditingProveedor && selectedProveedorId) {
                        try {
                          const res = await fetch(
                            `/api/gestion/proveedores/${selectedProveedorId}`,
                            {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                nombre: nuevoProveedorNombre.trim(),
                                telefono: nuevoProveedorTelefono.trim() || undefined,
                                email: nuevoProveedorEmail.trim() || undefined,
                              }),
                            }
                          );
                          if (!res.ok) {
                            toast.error('Error al actualizar proveedor');
                            return;
                          }
                          const proveedorActualizado = await res.json();
                          // Actualizar lista local
                          setProveedores((prev) =>
                            prev.map((p) =>
                              p._id === proveedorActualizado._id ? proveedorActualizado : p
                            )
                          );
                          // asegurar que se use este proveedor
                          proveedorIdToAssign = proveedorActualizado._id;
                        } catch (err) {
                          toast.error('Error de red al actualizar proveedor');
                          return;
                        }
                      }
                      // Si escribió un nuevo proveedor
                      if (nuevoProveedorNombre.trim() && !selectedProveedorId) {
                        try {
                          const res = await fetch('/api/gestion/proveedores', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              nombre: nuevoProveedorNombre.trim(),
                              telefono: nuevoProveedorTelefono.trim() || undefined,
                              email: nuevoProveedorEmail.trim() || undefined,
                            }),
                          });
                          if (res.ok) {
                            const nuevoProv = await res.json();
                            proveedorIdToAssign = nuevoProv._id;
                            // Actualiza lista local de proveedores
                            setProveedores((prev) => [...prev, nuevoProv]);
                          } else {
                            toast.error('Error al crear proveedor');
                            return;
                          }
                        } catch (err) {
                          toast.error('Error de red al crear proveedor');
                          return;
                        }
                      }
                      // Asignar proveedor al producto
                      try {
                        const res = await fetch(`/api/gestion/productos/${selectedProductForProveedor._id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ proveedor: proveedorIdToAssign }),
                        });
                        if (res.ok) {
                          const updatedProduct = await res.json();
                          // Actualizar en la UI localmente (SSE también lo capturará)
                          setProducts((prev) =>
                            prev.map((p) => (p._id === updatedProduct._id ? updatedProduct : p))
                          );
                          if (internalSearch.trim()) {
                            setSearchResults((prev) =>
                              prev.map((p) => (p._id === updatedProduct._id ? updatedProduct : p))
                            );
                          }
                          toast.success('Proveedor asignado correctamente');
                          setShowProveedorModal(false);
                        } else {
                          toast.error('Error al asignar proveedor');
                        }
                      } catch (err) {
                        toast.error('Error de red al asignar proveedor');
                      }
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded"
                  >
                    Guardar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}