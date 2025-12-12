'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { FaBox, FaPlus } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { Suspense } from 'react';

interface Product {
  _id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidadUnidad: number;
  precioMayorista: number;
  precioMinorista: number;
  stock: Array<{ deposito: string; cantidad: number }>;
  lotes: Array<{ lote: string; vencimiento: string; cantidad: number; deposito: string }>;
  activo: boolean;
  imagen?: string;
  createdAt: string;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalSearch, setInternalSearch] = useState('');

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });

  const limit = 10;

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

  // 📥 Cargar productos con paginación
  const loadProducts = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/gestion/productos?page=${currentPage}&limit=${limit}`);
      if (res.ok) {
        const data: ProductResponse = await res.json();
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
    loadProducts();
  }, [currentPage, isAuthorized]);

// ✅ POLLING INTELIGENTE: solo cuando la pestaña está enfocada
useEffect(() => {
  if (!isAuthorized) return;

  let intervalId: NodeJS.Timeout;

  const startPolling = () => {
    // Carga inicial inmediata
    loadProducts();

    // Polling cada 12 segundos
    intervalId = setInterval(() => {
      // Solo recargar si la pestaña está visible
      if (!document.hidden) {
        loadProducts();
      }
    }, 80000);
  };

  // Arrancar polling cuando autorizado
  startPolling();

  // Cleanup
  return () => {
    if (intervalId) clearInterval(intervalId);
  };
}, [isAuthorized]);
  if (!isAuthorized) return null;

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    return `${pathname}?${params.toString()}`;
  };

  const filteredProducts = products.filter((p) => {
    const text =
      p.nombre +
      ' ' +
      p.categoria +
      ' ' +
      p.unidad +
      ' ' +
      p.cantidadUnidad +
      ' ' +
      p.precioMayorista +
      ' ' +
      p.precioMinorista +
      ' ' +
      JSON.stringify(p.stock) +
      JSON.stringify(p.lotes);
    return text.toLowerCase().includes(internalSearch.toLowerCase());
  });

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
          setProducts((prev) => prev.filter((p) => p._id !== id));
        } else {
          toast.error('Error al eliminar');
        }
      }
    });
  };

  const updateProduct = async (id: string, formData: any) => {
    const res = await fetch(`/api/gestion/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        activo: formData.activo ?? true,
      }),
    });

    if (res.ok) toast.success('Producto actualizado');
    else toast.error('Error al actualizar');
  };

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

  return (
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

      {loading ? (
        <div className="text-gray-400">Cargando productos...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FaBox className="text-4xl mb-3 mx-auto text-amber-900/30" />
          <p>No hay productos registrados.</p>
          <Link href="/gestion/productos/nuevo" className="text-amber-500 hover:underline mt-2 inline-block">
            Crear tu primer producto
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <input
              type="text"
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              placeholder="Buscar en la tabla (uso interno)..."
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 text-gray-300">
                  <tr>
                    <th className="text-left py-3 px-4">Imagen</th>
                    <th className="text-left py-3 px-4">Producto</th>
                    <th className="text-left py-3 px-4">Categoría</th>
                    <th className="text-left py-3 px-4">Unidad</th>
                    <th className="text-left py-3 px-4">Precio Mayorista</th>
                    <th className="text-left py-3 px-4">Precio Minorista</th>
                    <th className="text-left py-3 px-4">Stock Total</th>
                    <th className="text-left py-3 px-4">Activo</th>
                    <th className="text-left py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredProducts.map((product) => {
                    const stockTotal = product.stock.reduce((sum, s) => sum + s.cantidad, 0);
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
                        <td className="py-3 px-4 text-amber-400">
                          ${product.precioMayorista.toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-4 text-amber-400">
                          ${product.precioMinorista.toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-4 text-white">{stockTotal}</td>
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
                                const updatedData = { ...product, activo: e.target.checked };
                                await updateProduct(product._id, updatedData);
                                setProducts((prev) => prev.map((p) => (p._id === product._id ? updatedData : p)));
                              }}
                            />
                            <span className="text-white">Activo</span>
                          </label>
                        </td>
                        <td className="py-3 px-4 flex gap-2">
                          <Link href={`/gestion/productos/editar/${product._id}`} className="text-blue-400 hover:underline">
                            Editar
                          </Link>
                          <button onClick={() => deleteProduct(product._id)} className="text-red-400 hover:underline">
                            Borrar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <br />

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
                  {products.map((product) =>
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
                              const updatedData = { ...product, lotes: updatedLotes };
                              await updateProduct(product._id, updatedData);
                              setProducts((prev) =>
                                prev.map((p) => (p._id === product._id ? updatedData : p))
                              );
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

          {pagination.totalPages > 1 && (
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
        </>
      )}
    </div>
  );
}