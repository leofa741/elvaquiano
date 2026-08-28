'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2'; // ✅ Agregado SweetAlert2
import Link from 'next/link';
import {
  FaChartLine,
  FaSearch,
  FaSave,
  FaUndo,
  FaBox,
  FaPercent,
  FaDollarSign,
  FaCheckSquare,
  FaSquare,
  FaMinusSquare,
  FaPlusSquare,
  FaCalculator,
  FaSync,
} from 'react-icons/fa';
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

// ✅ Formateo visual mientras escribe
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

type BulkOperation = 'add' | 'subtract';
type BulkMode = 'percentage' | 'amount';
type PriceField = 'precioLista' | 'precioMayorista' | 'precioOferta';

export default function PreciosMasivosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [editingPrices, setEditingPrices] = useState<Record<string, EditedPrice>>({});
  const [displayPrices, setDisplayPrices] = useState<
    Record<string, { precioLista: string; precioMayorista: string; precioOferta: string }>
  >({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<BulkMode>('percentage');
  const [bulkValue, setBulkValue] = useState<string>('');
  const [bulkOperation, setBulkOperation] = useState<BulkOperation>('add');
  const [bulkPriceField, setBulkPriceField] = useState<PriceField>('precioMayorista');
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const [applyToOriginal, setApplyToOriginal] = useState(true);

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

        const initialDisplay: Record<
          string,
          { precioLista: string; precioMayorista: string; precioOferta: string }
        > = {};
        foundProducts.forEach((p: Product) => {
          initialDisplay[p._id] = {
            precioLista: formatArgentineFinal(p.precioLista ?? null),
            precioMayorista: formatArgentineFinal(p.precioMayorista ?? null),
            precioOferta: formatArgentineFinal(p.precioOferta ?? null),
          };
        });
        setDisplayPrices(initialDisplay);
        setSelectedIds(new Set());
      } catch (err) {
        console.error('Error al buscar productos:', err);
        toast.error('Error al realizar la búsqueda');
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p._id)));
    }
  };

  // ✅ 🆕 LOGICA NUEVA: Mientras escribe, si es Precio Lista, sincroniza Mayorista y pone Oferta en 0
  const handlePriceChange = (productId: string, field: keyof EditedPrice, rawValue: string) => {
    const cleaned = formatArgentineInput(rawValue);
    const numericValue = parseArgentineNumber(cleaned);

    if (field === 'precioLista') {
      setDisplayPrices((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          precioLista: cleaned,
          precioMayorista: cleaned,
          precioOferta: numericValue === 0 ? '0,00' : '0,00',
        },
      }));

      setEditingPrices((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          precioLista: numericValue ?? undefined,
          precioMayorista: numericValue ?? undefined,
          precioOferta: 0,
        },
      }));
    } else {
      setDisplayPrices((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: cleaned,
        },
      }));

      setEditingPrices((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: numericValue ?? undefined,
        },
      }));
    }
  };

  // ✅ Al salir del campo
  const handlePriceBlur = (productId: string, field: keyof EditedPrice) => {
    const editedPrice = editingPrices[productId]?.[field];
    const product = products.find((p) => p._id === productId);

    if (editedPrice !== undefined) {
      setDisplayPrices((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: formatArgentineFinal(editedPrice),
        },
      }));
    } else if (product) {
      const originalValue = product[field as keyof Product] as number | null;
      setDisplayPrices((prev) => ({
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
    setSavingIds((prev) => new Set(prev).add(product._id));
    try {
      const changes = editingPrices[product._id];
      if (!changes || Object.keys(changes).length === 0) {
        toast.info('No hay cambios para guardar');
        return;
      }

      const precioLista = changes.precioLista ?? product.precioLista;
      const precioMayorista = changes.precioMayorista ?? product.precioMayorista;

      if (precioLista != null && precioMayorista != null && precioLista > precioMayorista) {
        toast.error(`"${product.nombre}": El precio mayorista no puede ser menor que el precio de lista`);
        throw new Error('Validación fallida');
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

      setProducts((prev) => prev.map((p) => (p._id === product._id ? { ...p, ...changes } : p)));

      setEditingPrices((prev) => {
        const newEditing = { ...prev };
        delete newEditing[product._id];
        return newEditing;
      });

      setDisplayPrices((prev) => ({
        ...prev,
        [product._id]: {
          precioLista: formatArgentineFinal(changes.precioLista ?? product.precioLista ?? null),
          precioMayorista: formatArgentineFinal(changes.precioMayorista ?? product.precioMayorista ?? null),
          precioOferta: formatArgentineFinal(changes.precioOferta !== undefined ? changes.precioOferta : (product.precioOferta ?? null)),
        },
      }));

      toast.success(`✅ "${product.nombre}" actualizado`);
    } catch (err) {
      console.error('Error al guardar:', err);
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(product._id);
        return newSet;
      });
    }
  };

  // 💾💾 Guardar todos los cambios (✅ AHORA CON SWEETALERT2)
  const saveAllChanges = async () => {
    const productsToSave = products.filter(
      (p) => editingPrices[p._id] && Object.keys(editingPrices[p._id]).length > 0
    );
    if (productsToSave.length === 0) {
      toast.info('No hay cambios para guardar');
      return;
    }

    // ✅ Reemplazo del confirm() nativo por SweetAlert2
    const result = await Swal.fire({
      title: '¿Guardar todos los cambios?',
      html: `Estás a punto de actualizar <strong>${productsToSave.length}</strong> producto(s).<br/><span class="text-gray-400 text-sm">Esta acción sincronizará los precios en toda la plataforma.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706', // amber-600
      cancelButtonColor: '#4b5563', // gray-600
      confirmButtonText: 'Sí, guardar todo',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      background: '#1f2937', // gray-800
      color: '#f3f4f6', // gray-100
    });

    if (!result.isConfirmed) return;

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
    
    if (successCount > 0 && errorCount === 0) {
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: `${successCount} producto(s) actualizado(s) correctamente.`,
        timer: 2500,
        showConfirmButton: false,
        background: '#1f2937',
        color: '#f3f4f6',
      });
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`${successCount} guardados, pero ${errorCount} fallaron.`);
    } else {
      toast.error('No se pudo guardar ningún producto.');
    }
  };

  // 🔄 Descartar cambios de un producto
  const discardChanges = (productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return;

    setEditingPrices((prev) => {
      const newEditing = { ...prev };
      delete newEditing[productId];
      return newEditing;
    });

    setDisplayPrices((prev) => ({
      ...prev,
      [productId]: {
        precioLista: formatArgentineFinal(product.precioLista ?? null),
        precioMayorista: formatArgentineFinal(product.precioMayorista ?? null),
        precioOferta: formatArgentineFinal(product.precioOferta ?? null),
      },
    }));
  };

  const getPriceDiff = (product: Product, field: keyof EditedPrice) => {
    const original = (product[field as keyof Product] as number) || 0;
    const edited = editingPrices[product._id]?.[field];
    if (edited === undefined || edited === null) return 0;
    return edited - original;
  };

  const hasChanges = Object.keys(editingPrices).some(
    (id) => Object.keys(editingPrices[id]).length > 0
  );

  const bulkPreview = useMemo(() => {
    if (!bulkValue.trim() || selectedIds.size === 0) return null;
    const numValue = parseArgentineNumber(bulkValue);
    if (numValue === null || numValue < 0) return null;

    const preview: Array<{
      product: Product;
      originalPrice: number | null;
      newPrice: number;
      diff: number;
    }> = [];

    selectedIds.forEach((id) => {
      const product = products.find((p) => p._id === id);
      if (!product) return;

      const basePrice = applyToOriginal
        ? ((product[bulkPriceField] as number | null) ?? 0)
        : (editingPrices[id]?.[bulkPriceField] ?? ((product[bulkPriceField] as number | null) ?? 0));

      if (basePrice === null) return;

      let newPrice: number;
      if (bulkMode === 'percentage') {
        const factor = bulkOperation === 'add' ? 1 + numValue / 100 : 1 - numValue / 100;
        newPrice = Math.round(basePrice * factor * 100) / 100;
      } else {
        newPrice = bulkOperation === 'add'
          ? Math.round((basePrice + numValue) * 100) / 100
          : Math.round((basePrice - numValue) * 100) / 100;
      }

      if (newPrice < 0) newPrice = 0;

      preview.push({
        product,
        originalPrice: basePrice,
        newPrice,
        diff: newPrice - basePrice,
      });
    });

    return preview;
  }, [bulkValue, bulkMode, bulkOperation, bulkPriceField, selectedIds, products, editingPrices, applyToOriginal]);

  // 🆕 Aplicar cambios masivos con la nueva lógica de sincronización
  const applyBulkChanges = () => {
    if (!bulkPreview || bulkPreview.length === 0) {
      toast.info('Configurá los valores primero');
      return;
    }

    let validationError = false;
    bulkPreview.forEach(({ product, newPrice }) => {
      if (bulkPriceField === 'precioLista') {
        const precioMayoristaActual = editingPrices[product._id]?.precioMayorista ?? product.precioMayorista;
        if (newPrice > precioMayoristaActual && precioMayoristaActual !== newPrice) {
           // Esta validación es informativa, pero al sincronizar se arregla sola
        }
      } else if (bulkPriceField === 'precioMayorista') {
        const precioListaActual = editingPrices[product._id]?.precioLista ?? product.precioLista;
        if (precioListaActual != null && newPrice < precioListaActual) {
          toast.error(`"${product.nombre}": El precio mayorista no puede ser menor al de lista`);
          validationError = true;
        }
      }
    });

    if (validationError) {
      toast.error('Revisá los conflictos antes de aplicar');
      return;
    }

    // Aplicar a editingPrices
    setEditingPrices((prev) => {
      const newEditing = { ...prev };
      bulkPreview.forEach(({ product, newPrice }) => {
        if (bulkPriceField === 'precioLista') {
          newEditing[product._id] = {
            ...newEditing[product._id],
            precioLista: newPrice,
            precioMayorista: newPrice, 
            precioOferta: 0,            
          };
        } else {
          newEditing[product._id] = {
            ...newEditing[product._id],
            [bulkPriceField]: newPrice,
          };
        }
      });
      return newEditing;
    });

    // Aplicar a displayPrices (lo que ve el usuario)
    setDisplayPrices((prev) => {
      const newDisplay = { ...prev };
      bulkPreview.forEach(({ product, newPrice }) => {
        if (bulkPriceField === 'precioLista') {
          newDisplay[product._id] = {
            ...newDisplay[product._id],
            precioLista: formatArgentineFinal(newPrice),
            precioMayorista: formatArgentineFinal(newPrice),
            precioOferta: formatArgentineFinal(0),
          };
        } else {
          newDisplay[product._id] = {
            ...newDisplay[product._id],
            [bulkPriceField]: formatArgentineFinal(newPrice),
          };
        }
      });
      return newDisplay;
    });

    toast.success(`✨ Cambios aplicados en ${bulkPreview.length} producto(s). Revisá y presioná "Guardar todos los cambios"`, { autoClose: 5000 });
    setBulkValue('');
    setShowBulkPanel(false);
  };

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
          <p className="text-gray-400">Buscá productos por nombre y editá sus precios de forma rápida.</p>
          <p className="text-gray-500 text-sm mt-1">
            <Link href="/gestion" className="text-amber-400 underline hover:text-amber-300">← Volver a Gestión</Link>
          </p>
        </div>

        {/* Instrucciones */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <h3 className="text-yellow-300 font-extrabold text-xl mb-3 border-l-4 border-yellow-400 pl-3">💡 Instrucciones:</h3>
          <ul className="text-sm text-blue-200 space-y-1 list-disc list-inside">
            <li><strong>Edición individual:</strong> Si modificás el <span className="text-amber-400 font-bold">Precio de Lista</span>, el Precio Mayorista se igualará automáticamente y la Oferta se pondrá en $0,00.</li>
            <li><strong>Edición masiva:</strong> seleccioná varios productos y presioná <span className="text-yellow-300 font-bold">"Aplicar cambio masivo"</span>.</li>
            <li>Los cambios se muestran en verde (aumento) o rojo (disminución).</li>
            <li>Podés guardar individualmente o todos los cambios con el botón superior.</li>
          </ul>
        </div>
        <br />

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

        {/* Panel de acciones masivas */}
        {selectedIds.size > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-700 rounded-xl p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                  {selectedIds.size}
                </div>
                <div>
                  <p className="font-semibold text-white">{selectedIds.size} producto(s) seleccionado(s)</p>
                  <button onClick={() => setSelectedIds(new Set())} className="text-xs text-amber-300 hover:text-amber-200 underline">Limpiar selección</button>
                </div>
              </div>
              <button
                onClick={() => setShowBulkPanel(!showBulkPanel)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
              >
                <FaCalculator /> {showBulkPanel ? 'Ocultar editor masivo' : 'Aplicar cambio masivo'}
              </button>
            </div>

            {showBulkPanel && (
              <div className="mt-4 pt-4 border-t border-amber-700/50 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-amber-200 mb-2">¿Qué precio querés modificar?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['precioLista', 'precioMayorista', 'precioOferta'] as PriceField[]).map((field) => (
                      <button
                        key={field}
                        onClick={() => setBulkPriceField(field)}
                        className={`px-4 py-2 rounded-lg border transition flex items-center justify-center gap-2 ${
                          bulkPriceField === field
                            ? 'bg-amber-600 border-amber-500 text-white'
                            : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {field === 'precioLista' && <FaSync size={14} />}
                        {field === 'precioLista' ? '💰 Precio Lista (Sincroniza)' : field === 'precioMayorista' ? '🏷️ Precio Mayorista' : '🔥 Precio Oferta'}
                      </button>
                    ))}
                  </div>
                  {bulkPriceField === 'precioLista' && (
                    <p className="text-xs text-amber-300 mt-2 flex items-center gap-1">
                      <FaSync size={12} /> Al modificar este, el Precio Mayorista se igualará y la Oferta se pondrá en $0,00.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-200 mb-2">¿Cómo querés modificarlo?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBulkMode('percentage')}
                      className={`px-4 py-2 rounded-lg border transition flex items-center justify-center gap-2 ${
                        bulkMode === 'percentage' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <FaPercent /> Porcentaje (%)
                    </button>
                    <button
                      onClick={() => setBulkMode('amount')}
                      className={`px-4 py-2 rounded-lg border transition flex items-center justify-center gap-2 ${
                        bulkMode === 'amount' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <FaDollarSign /> Importe fijo ($)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-amber-200 mb-2">Operación</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setBulkOperation('add')}
                        className={`px-3 py-2 rounded-lg border transition flex items-center justify-center gap-1 ${
                          bulkOperation === 'add' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <FaPlusSquare /> Sumar
                      </button>
                      <button
                        onClick={() => setBulkOperation('subtract')}
                        className={`px-3 py-2 rounded-lg border transition flex items-center justify-center gap-1 ${
                          bulkOperation === 'subtract' ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <FaMinusSquare /> Restar
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="applyToOriginal"
                      checked={applyToOriginal}
                      onChange={(e) => setApplyToOriginal(e.target.checked)}
                      className="w-4 h-4 text-amber-600 bg-gray-700 border-gray-600 rounded focus:ring-amber-500"
                    />
                    <label htmlFor="applyToOriginal" className="text-sm text-amber-200">Aplicar sobre precio original (ignorar cambios manuales pendientes)</label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-amber-200 mb-2">Valor {bulkMode === 'percentage' ? '(%)' : '($)'}</label>
                    <input
                      type="text"
                      value={bulkValue}
                      onChange={(e) => setBulkValue(formatArgentineInput(e.target.value))}
                      placeholder={bulkMode === 'percentage' ? 'Ej: 10' : 'Ej: 500,00'}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={applyBulkChanges}
                      disabled={!bulkPreview || isApplyingBulk}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition"
                    >
                      <FaCheckSquare /> Aplicar a {selectedIds.size} producto(s)
                    </button>
                  </div>
                </div>

                {/* Preview de cambios */}
                {bulkPreview && bulkPreview.length > 0 && (
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                    <p className="text-sm text-amber-200 font-medium mb-2 flex items-center gap-2">
                      <FaCalculator /> Vista previa de los cambios:
                      {bulkPriceField === 'precioLista' && <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded border border-amber-700">Incluye sincronización de Mayorista y Oferta en 0</span>}
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {bulkPreview.map(({ product, originalPrice, newPrice, diff }) => (
                        <div key={product._id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-gray-800/50 rounded px-3 py-2 gap-1">
                          <span className="text-gray-300 truncate flex-1 font-medium">{product.nombre}</span>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">{originalPrice !== null ? formatARS(originalPrice) : '—'}</span>
                            <span className="text-gray-500">→</span>
                            <span className="text-white font-semibold">{formatARS(newPrice)}</span>
                            <span className={`font-bold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                              {diff > 0 ? '+' : ''}{formatARS(diff)}
                            </span>
                          </div>

                          {bulkPriceField === 'precioLista' && (
                            <span className="text-xs text-amber-400 font-medium bg-amber-900/20 px-2 py-0.5 rounded border border-amber-800/50 whitespace-nowrap">
                              Mayorista: {formatARS(newPrice)} | Oferta: $0,00
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Botón guardar todos */}
        {hasChanges && (
          <div className="mb-6 flex justify-end sticky bottom-4 z-10">
            <button
              onClick={saveAllChanges}
              disabled={savingAll}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition shadow-lg shadow-amber-900/50"
            >
              <FaSave />
              {savingAll ? 'Guardando...' : `Guardar todos los cambios (${Object.keys(editingPrices).filter((id) => Object.keys(editingPrices[id]).length > 0).length})`}
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
                    <th className="text-center py-3 px-2 w-12">
                      <button onClick={toggleSelectAll} className="text-amber-400 hover:text-amber-300 transition" title={selectedIds.size === products.length ? 'Deseleccionar todos' : 'Seleccionar todos'}>
                        {selectedIds.size === products.length ? <FaCheckSquare size={20} /> : selectedIds.size > 0 ? <div className="relative"><FaSquare size={20} className="text-gray-500" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 bg-amber-400 rounded-sm"></div></div></div> : <FaSquare size={20} className="text-gray-500" />}
                      </button>
                    </th>
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
                    const isSelected = selectedIds.has(product._id);

                    return (
                      <tr key={product._id} className={`hover:bg-gray-750 transition ${isEditing ? 'bg-amber-900/10' : ''} ${isSelected ? 'bg-blue-900/10' : ''}`}>
                        <td className="text-center py-3 px-2">
                          <button onClick={() => toggleSelectProduct(product._id)} className={`transition ${isSelected ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}>
                            {isSelected ? <FaCheckSquare size={18} /> : <FaSquare size={18} />}
                          </button>
                        </td>
                        <td className="py-3 px-4"><div className="font-semibold text-white">{product.nombre}</div></td>
                        <td className="py-3 px-4 text-gray-300">{product.categoria}</td>
                        <td className="py-3 px-4 text-gray-300">{product.unidad}</td>

                        {/* Precio Lista */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={displayPrices[product._id]?.precioLista || ''}
                              onChange={(e) => handlePriceChange(product._id, 'precioLista', e.target.value)}
                              onBlur={() => handlePriceBlur(product._id, 'precioLista')}
                              className="w-28 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-amber-500"
                              placeholder="0,00"
                            />
                            {isEditing && editingPrices[product._id]?.precioLista !== undefined && (
                              <span className={`text-xs font-medium ${getPriceDiff(product, 'precioLista') > 0 ? 'text-green-400' : getPriceDiff(product, 'precioLista') < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                {getPriceDiff(product, 'precioLista') > 0 ? '+' : ''}{getPriceDiff(product, 'precioLista').toFixed(2)}
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
                              onChange={(e) => handlePriceChange(product._id, 'precioMayorista', e.target.value)}
                              onBlur={() => handlePriceBlur(product._id, 'precioMayorista')}
                              className="w-28 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-amber-500"
                              placeholder="0,00"
                            />
                            {isEditing && editingPrices[product._id]?.precioMayorista !== undefined && (
                              <span className={`text-xs font-medium ${getPriceDiff(product, 'precioMayorista') > 0 ? 'text-green-400' : getPriceDiff(product, 'precioMayorista') < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                {getPriceDiff(product, 'precioMayorista') > 0 ? '+' : ''}{getPriceDiff(product, 'precioMayorista').toFixed(2)}
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
                              onChange={(e) => handlePriceChange(product._id, 'precioOferta', e.target.value)}
                              onBlur={() => handlePriceBlur(product._id, 'precioOferta')}
                              className="w-28 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-amber-500"
                              placeholder="0,00"
                            />
                            {isEditing && editingPrices[product._id]?.precioOferta !== undefined && (
                              <span className={`text-xs font-medium ${getPriceDiff(product, 'precioOferta') > 0 ? 'text-green-400' : getPriceDiff(product, 'precioOferta') < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                {getPriceDiff(product, 'precioOferta') > 0 ? '+' : ''}{getPriceDiff(product, 'precioOferta').toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {isEditing && (
                              <>
                                <button onClick={() => saveProductPrice(product)} disabled={isSaving} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition">
                                  <FaSave size={12} /> {isSaving ? '...' : 'Guardar'}
                                </button>
                                <button onClick={() => discardChanges(product._id)} disabled={isSaving} className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition">
                                  <FaUndo size={12} /> Descartar
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
      </div>
    </div>
  );
}