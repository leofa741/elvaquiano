'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { FaChartLine, FaSearch, FaSave, FaUndo, FaBox } from 'react-icons/fa';
import { formatARS } from '@/app/lib/formatcurrenci';

// ✅ Parsear número argentino a número real
const parseArgentineNumber = (input: string): number | null => {
  if (!input.trim()) return null;

  let clean = input.replace(/[^\d.,]/g, '');
  if (!clean) return null;

  const commaCount = (clean.match(/,/g) || []).length;
  if (commaCount > 1) return null;

  if (commaCount === 1) {
    clean = clean.replace(/\./g, '');
    clean = clean.replace(',', '.');
  } else {
    clean = clean.replace(/\./g, '');
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
};


// ✅ Formateo visual mientras escribe (sin forzar decimales)
const formatArgentineInput = (input: string): string => {
  if (!input.trim()) return '';
  let clean = input.replace(/[^\d.,]/g, '');
  const parts = clean.split(',');
  if (parts.length > 2) {
    clean = parts[0] + ',' + parts.slice(1).join('');
  }
  return clean;
};

// ✅ Formateo final (al salir del campo)
const formatArgentineFinal = (value: number | null): string => {
  if (value === null || isNaN(value)) return '';
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface Product {
  _id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidadUnidad: number;
  precioLista: number;
  precioMayorista: number;
  precioOferta: number | null;
}

interface EditedPrice {
  precioLista?: number;
  precioMayorista?: number;
  precioOferta?: number | null;
}

export default function PreciosMasivosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [editingPrices, setEditingPrices] = useState<Record<string, EditedPrice>>({});
  const [displayPrices, setDisplayPrices] = useState<Record<string, { precioLista: string; precioMayorista: string; precioOferta: string }>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  // 🔒 Validación de acceso
  useEffect(() => {
    const validateAccess = async () => {
      if (status === 'loading') return;
      if (status === 'unauthenticated') {
        router.push('/login');
        return;
      }
      const token = session?.user?.token || localStorage.getItem('token');
      if (!token) {
        toast.error('Acceso denegado');
        router.push('/login');
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
        router.push('/login');
      }
    };
    validateAccess();
  }, [status, session, router]);

  // 🔍 Búsqueda con debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setProducts([]);
      return;
    }

    const handler = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/gestion/productos/search?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (!res.ok) throw new Error('Error en la búsqueda');
        const data = await res.json();
        const foundProducts = data.products || [];
        setProducts(foundProducts);
        
        // Inicializar display prices
        const initialDisplay: Record<string, { precioLista: string; precioMayorista: string; precioOferta: string }> = {};
        foundProducts.forEach((p: Product) => {
          initialDisplay[p._id] = {
            precioLista: formatArgentineFinal(p.precioLista ?? null),
            precioMayorista: formatArgentineFinal(p.precioMayorista ?? null),
            precioOferta: formatArgentineFinal(p.precioOferta ?? null),
          };
        });
        setDisplayPrices(initialDisplay);
      } catch (err) {
        console.error('Error al buscar productos:', err);
        toast.error('Error al realizar la búsqueda');
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ✅ Mientras escribe
  const handlePriceChange = (productId: string, field: keyof EditedPrice, rawValue: string) => {
    const cleaned = formatArgentineInput(rawValue);
    
    setDisplayPrices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: cleaned,
      },
    }));

    const numericValue = parseArgentineNumber(cleaned);
    
    setEditingPrices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: numericValue ?? undefined,
      },
    }));
  };

  // ✅ Al salir del campo
  const handlePriceBlur = (productId: string, field: keyof EditedPrice) => {
    const editedPrice = editingPrices[productId]?.[field];
    const product = products.find(p => p._id === productId);
    
    if (editedPrice !== undefined) {
      setDisplayPrices(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: formatArgentineFinal(editedPrice),
        },
      }));
    } else if (product) {
      const originalValue = product[field as keyof Product] as number | null;
      setDisplayPrices(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: formatArgentineFinal(originalValue),
        },
      }));
    }
  };

  // 💾 Guardar cambios de un producto
  const saveProductPrice = async (product: Product) => {
    setSavingIds(prev => new Set(prev).add(product._id));
    try {
      const changes = editingPrices[product._id];
      if (!changes || Object.keys(changes).length === 0) {
        toast.info('No hay cambios para guardar');
        return;
      }

      // Validación: precioLista no puede ser mayor que precioMayorista
      const precioLista = changes.precioLista ?? product.precioLista;
      const precioMayorista = changes.precioMayorista ?? product.precioMayorista;
      
      if (precioLista != null && precioMayorista != null && precioLista > precioMayorista) {
        toast.error('El precio mayorista no puede ser menor que el precio de lista');
        return;
      }

      const res = await fetch(`/api/gestion/productos/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.message || 'Error al actualizar');
      }

      // Actualizar el producto localmente
      setProducts(prev =>
        prev.map(p =>
          p._id === product._id ? { ...p, ...changes } : p
        )
      );

      // Limpiar edición
      setEditingPrices(prev => {
        const newEditing = { ...prev };
        delete newEditing[product._id];
        return newEditing;
      });

      toast.success(`✅ Precios de "${product.nombre}" actualizados`);
    } catch (err) {
      console.error('Error al guardar:', err);
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(product._id);
        return newSet;
      });
    }
  };

  // 💾💾 Guardar todos los cambios
  const saveAllChanges = async () => {
    const productsToSave = products.filter(p => editingPrices[p._id] && Object.keys(editingPrices[p._id]).length > 0);
    if (productsToSave.length === 0) {
      toast.info('No hay cambios para guardar');
      return;
    }

    if (!confirm(`¿Guardar cambios en ${productsToSave.length} producto(s)?`)) return;

    setSavingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const product of productsToSave) {
      try {
        await saveProductPrice(product);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setSavingAll(false);
    if (successCount > 0) toast.success(`${successCount} producto(s) actualizado(s)`);
    if (errorCount > 0) toast.error(`${errorCount} producto(s) con error`);
  };

  // 🔄 Descartar cambios de un producto
  const discardChanges = (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    setEditingPrices(prev => {
      const newEditing = { ...prev };
      delete newEditing[productId];
      return newEditing;
    });

    setDisplayPrices(prev => ({
      ...prev,
      [productId]: {
        precioLista: formatArgentineFinal(product.precioLista ?? null),
        precioMayorista: formatArgentineFinal(product.precioMayorista ?? null),
        precioOferta: formatArgentineFinal(product.precioOferta ?? null),
      },
    }));
  };

  // 📊 Calcular diferencia de precio
  const getPriceDiff = (product: Product, field: keyof EditedPrice) => {
    const original = (product[field as keyof Product] as number) || 0;
    const edited = editingPrices[product._id]?.[field];
    if (edited === undefined || edited === null) return 0;
    return edited - original;
  };

  const hasChanges = Object.keys(editingPrices).some(id => Object.keys(editingPrices[id]).length > 0);

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FaChartLine className="text-amber-400 text-2xl" />
            <h1 className="text-3xl md:text-4xl font-bold">Edición Masiva de Precios</h1>
          </div>
          <p className="text-gray-400">
            Buscá productos por nombre y editá sus precios de forma rápida.
          </p>
          <p className="text-gray-500 text-sm mt-1">
            <Link href="/gestion" className="text-amber-400 underline hover:text-amber-300">
              ← Volver a Gestión
            </Link>
          </p>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos por nombre (mínimo 2 caracteres)..."
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          {searching && (
            <p className="text-gray-400 text-sm mt-2 flex items-center gap-2">
              <span className="animate-spin">⏳</span> Buscando...
            </p>
          )}
        </div>

        {/* Botón guardar todos */}
        {hasChanges && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={saveAllChanges}
              disabled={savingAll}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
            >
              <FaSave />
              {savingAll ? 'Guardando...' : `Guardar todos los cambios (${Object.keys(editingPrices).filter(id => Object.keys(editingPrices[id]).length > 0).length})`}
            </button>
          </div>
        )}

        {/* Tabla de productos */}
        {products.length > 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 text-gray-300">
                  <tr>
                    <th className="text-left py-3 px-4">Producto</th>
                    <th className="text-left py-3 px-4">Categoría</th>
                    <th className="text-left py-3 px-4">Unidad</th>
                    <th className="text-left py-3 px-4">Precio Lista</th>
                    <th className="text-left py-3 px-4">Precio Mayorista</th>
                    <th className="text-left py-3 px-4">Precio Oferta</th>
                    <th className="text-left py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {products.map((product) => {
                    const isEditing = editingPrices[product._id] && Object.keys(editingPrices[product._id]).length > 0;
                    const isSaving = savingIds.has(product._id);

                    return (
                      <tr
                        key={product._id}
                        className={`hover:bg-gray-750 transition ${
                          isEditing ? 'bg-amber-900/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{product.nombre}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{product.categoria}</td>
                        <td className="py-3 px-4 text-gray-300">{product.unidad}</td>

                        {/* Precio Lista */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={displayPrices[product._id]?.precioLista || ''}
                              onChange={(e) =>
                                handlePriceChange(product._id, 'precioLista', e.target.value)
                              }
                              onBlur={() => handlePriceBlur(product._id, 'precioLista')}
                              className="w-28 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-amber-500"
                              placeholder="0,00"
                            />
                            {isEditing && editingPrices[product._id]?.precioLista !== undefined && (
                              <span
                                className={`text-xs font-medium ${
                                  getPriceDiff(product, 'precioLista') > 0
                                    ? 'text-green-400'
                                    : getPriceDiff(product, 'precioLista') < 0
                                    ? 'text-red-400'
                                    : 'text-gray-400'
                                }`}
                              >
                                {getPriceDiff(product, 'precioLista') > 0 ? '+' : ''}
                                {getPriceDiff(product, 'precioLista').toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Precio Mayorista */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={displayPrices[product._id]?.precioMayorista || ''}
                              onChange={(e) =>
                                handlePriceChange(product._id, 'precioMayorista', e.target.value)
                              }
                              onBlur={() => handlePriceBlur(product._id, 'precioMayorista')}
                              className="w-28 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-amber-500"
                              placeholder="0,00"
                            />
                            {isEditing && editingPrices[product._id]?.precioMayorista !== undefined && (
                              <span
                                className={`text-xs font-medium ${
                                  getPriceDiff(product, 'precioMayorista') > 0
                                    ? 'text-green-400'
                                    : getPriceDiff(product, 'precioMayorista') < 0
                                    ? 'text-red-400'
                                    : 'text-gray-400'
                                }`}
                              >
                                {getPriceDiff(product, 'precioMayorista') > 0 ? '+' : ''}
                                {getPriceDiff(product, 'precioMayorista').toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Precio Oferta */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={displayPrices[product._id]?.precioOferta || ''}
                              onChange={(e) =>
                                handlePriceChange(product._id, 'precioOferta', e.target.value)
                              }
                              onBlur={() => handlePriceBlur(product._id, 'precioOferta')}
                              className="w-28 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-amber-500"
                              placeholder="0,00"
                            />
                            {isEditing && editingPrices[product._id]?.precioOferta !== undefined && (
                              <span
                                className={`text-xs font-medium ${
                                  getPriceDiff(product, 'precioOferta') > 0
                                    ? 'text-green-400'
                                    : getPriceDiff(product, 'precioOferta') < 0
                                    ? 'text-red-400'
                                    : 'text-gray-400'
                                }`}
                              >
                                {getPriceDiff(product, 'precioOferta') > 0 ? '+' : ''}
                                {getPriceDiff(product, 'precioOferta').toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {isEditing && (
                              <>
                                <button
                                  onClick={() => saveProductPrice(product)}
                                  disabled={isSaving}
                                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition"
                                >
                                  <FaSave size={12} />
                                  {isSaving ? '...' : 'Guardar'}
                                </button>
                                <button
                                  onClick={() => discardChanges(product._id)}
                                  disabled={isSaving}
                                  className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition"
                                >
                                  <FaUndo size={12} />
                                  Descartar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : searchQuery.trim().length >= 2 && !searching ? (
          <div className="text-center py-12 text-gray-500">
            <FaBox className="text-4xl mb-3 mx-auto text-amber-900/30" />
            <p>No se encontraron productos para "{searchQuery}"</p>
          </div>
        ) : searchQuery.trim().length < 2 ? (
          <div className="text-center py-12 text-gray-500">
            <FaSearch className="text-4xl mb-3 mx-auto text-amber-900/30" />
            <p>Escribe al menos 2 caracteres para buscar productos</p>
          </div>
        ) : null}

        {/* Instrucciones */}
        {products.length > 0 && (
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
            <h3 className="text-blue-300 font-semibold mb-2 underline text-lg">💡 Instrucciones:</h3>
            <ul className="text-sm text-blue-200 space-y-1 list-disc list-inside">
              <li>Modificá los precios directamente en los inputs (acepta formato argentino: 1.234,56)</li>
              <li>Los cambios se muestran en verde (aumento) o rojo (disminución)</li>
              <li>El precio mayorista NO puede ser menor que el precio de lista</li>
              <li>Podés guardar individualmente con el botón "Guardar" de cada fila</li>
              <li>O guardar todos los cambios con el botón superior</li>
              <li>Los cambios se propagan automáticamente a presupuestos y pedidos existentes</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}