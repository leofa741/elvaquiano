'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
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

  // 🆕 Estados para selección y edición masiva
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<BulkMode>('percentage');
  const [bulkValue, setBulkValue] = useState<string>('');
  const [bulkOperation, setBulkOperation] = useState<BulkOperation>('add');
  const [bulkPriceField, setBulkPriceField] = useState<PriceField>('precioMayorista');
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  // 🆕 Después de los otros estados
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

        // Limpiar selección cuando cambia la búsqueda
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

  // 🆕 Manejo de selección individual
  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 🆕 Seleccionar / deseleccionar todos
  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p._id)));
    }
  };

  // ✅ Mientras escribe
  const handlePriceChange = (productId: string, field: keyof EditedPrice, rawValue: string) => {
    const cleaned = formatArgentineInput(rawValue);

    setDisplayPrices((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: cleaned,
      },
    }));

    const numericValue = parseArgentineNumber(cleaned);

    setEditingPrices((prev) => ({
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
        toast.error(
          `"${product.nombre}": El precio mayorista no puede ser menor que el precio de lista`
        );
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

      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, ...changes } : p))
      );

      setEditingPrices((prev) => {
        const newEditing = { ...prev };
        delete newEditing[product._id];
        return newEditing;
      });

      // Actualizar display prices con los valores guardados
      setDisplayPrices((prev) => ({
        ...prev,
        [product._id]: {
          precioLista: formatArgentineFinal(changes.precioLista ?? product.precioLista ?? null),
          precioMayorista: formatArgentineFinal(
            changes.precioMayorista ?? product.precioMayorista ?? null
          ),
          precioOferta: formatArgentineFinal(
            changes.precioOferta !== undefined
              ? changes.precioOferta
              : (product.precioOferta ?? null)
          ),
        },
      }));

      toast.success(`✅ "${product.nombre}" actualizado`);
    } catch (err) {
      console.error('Error al guardar:', err);
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
      throw err;
    } finally {
      setSavingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(product._id);
        return newSet;
      });
    }
  };

  // 💾💾 Guardar todos los cambios
  const saveAllChanges = async () => {
    const productsToSave = products.filter(
      (p) => editingPrices[p._id] && Object.keys(editingPrices[p._id]).length > 0
    );
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

  // 📊 Calcular diferencia de precio
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

      // 🆕 Si applyToOriginal es true, SIEMPRE usar el precio original del producto
      // Si es false, usar el valor editado (comportamiento actual)
      const basePrice = applyToOriginal
        ? ((product[bulkPriceField] as number | null) ?? 0)
        : (editingPrices[id]?.[bulkPriceField] ?? ((product[bulkPriceField] as number | null) ?? 0));

      if (basePrice === null) return;

      let newPrice: number;
      if (bulkMode === 'percentage') {
        const factor = bulkOperation === 'add' ? 1 + numValue / 100 : 1 - numValue / 100;
        newPrice = Math.round(basePrice * factor * 100) / 100;
      } else {
        newPrice =
          bulkOperation === 'add'
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

  // 🆕 Aplicar cambios masivos (los pone en editingPrices, NO los guarda aún)
  const applyBulkChanges = () => {
    if (!bulkPreview || bulkPreview.length === 0) {
      toast.info('Configurá los valores primero');
      return;
    }

    // Validación cruzada: si el precio a modificar es Lista o Mayorista, chequear restricción
    let validationError = false;

    bulkPreview.forEach(({ product, newPrice }) => {
      if (bulkPriceField === 'precioLista') {
        // Si cambiamos lista, verificar contra mayorista actual (o editado)
        const precioMayoristaActual =
          editingPrices[product._id]?.precioMayorista ?? product.precioMayorista;
        if (newPrice > precioMayoristaActual) {
          toast.error(
            `"${product.nombre}": El precio de lista (${formatARS(newPrice)}) no puede superar al mayorista (${formatARS(precioMayoristaActual)})`
          );
          validationError = true;
        }
      } else if (bulkPriceField === 'precioMayorista') {
        const precioListaActual =
          editingPrices[product._id]?.precioLista ?? product.precioLista;
        if (precioListaActual != null && newPrice < precioListaActual) {
          toast.error(
            `"${product.nombre}": El precio mayorista (${formatARS(newPrice)}) no puede ser menor al de lista (${formatARS(precioListaActual)})`
          );
          validationError = true;
        }
      }
    });

    if (validationError) {
      toast.error('Revisá los conflictos antes de aplicar');
      return;
    }

    // Aplicar a editingPrices y displayPrices
    setEditingPrices((prev) => {
      const newEditing = { ...prev };
      bulkPreview.forEach(({ product, newPrice }) => {
        newEditing[product._id] = {
          ...newEditing[product._id],
          [bulkPriceField]: newPrice,
        };
      });
      return newEditing;
    });

    setDisplayPrices((prev) => {
      const newDisplay = { ...prev };
      bulkPreview.forEach(({ product, newPrice }) => {
        newDisplay[product._id] = {
          ...newDisplay[product._id],
          [bulkPriceField]: formatArgentineFinal(newPrice),
        };
      });
      return newDisplay;
    });

    toast.success(
      `✨ Cambios aplicados en ${bulkPreview.length} producto(s). Revisá y presioná "Guardar todos los cambios"`,
      { autoClose: 5000 }
    );

    // Reset del panel
    setBulkValue('');
    setShowBulkPanel(false);
  };

  const fieldLabel = {
    precioLista: 'Precio de Lista',
    precioMayorista: 'Precio Mayorista',
    precioOferta: 'Precio Oferta',
  }[bulkPriceField];

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

        {/* Instrucciones */}

        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">

          <h3 className="text-yellow-300 font-extrabold text-xl mb-3 border-l-4 border-yellow-400 pl-3">
            💡 Instrucciones:
          </h3>

          <ul className="text-sm text-blue-200 space-y-1 list-disc list-inside">
            <li>
              <strong>Edición individual:</strong> modificá los precios directamente en los
              inputs (acepta formato argentino: 1.234,56)
            </li>
            <li>
              <strong>Edición masiva:</strong> seleccioná varios productos con los checkboxes y
              <strong className="text-amber-400">  presioná<span className="text-yellow-300 text-xl font-bold drop-shadow-[0_0_6px_rgba(253,224,71,0.5)]">
                "Aplicar cambio masivo"
              </span></strong> para aplicar un porcentaje o importe a todos
            </li>
            <li>Los cambios se muestran en verde (aumento) o rojo (disminución)</li>
            <li>El precio mayorista NO puede ser menor que el precio de lista</li>
            <li>Podés guardar individualmente o todos los cambios con el botón superior</li>
            <li className="text-amber-400">Los cambios se propagan automáticamente a presupuestos y pedidos existentes</li>
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



        {/* 🆕 Panel de acciones masivas - SOLO cuando hay productos seleccionados */}
        {selectedIds.size > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-700 rounded-xl p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                  {selectedIds.size}
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {selectedIds.size} producto(s) seleccionado(s)
                  </p>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-amber-300 hover:text-amber-200 underline"
                  >
                    Limpiar selección
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowBulkPanel(!showBulkPanel)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
              >
                <FaCalculator />
                {showBulkPanel ? 'Ocultar editor masivo' : 'Aplicar cambio masivo'}
              </button>
            </div>


            {/* Panel expandible */}
            {showBulkPanel && (
              <div className="mt-4 pt-4 border-t border-amber-700/50 space-y-4">
                {/* Fila 1: Tipo de precio a modificar */}
                <div>
                  <label className="block text-sm font-medium text-amber-200 mb-2">
                    ¿Qué precio querés modificar?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['precioLista', 'precioMayorista', 'precioOferta'] as PriceField[]).map(
                      (field) => (
                        <button
                          key={field}
                          onClick={() => setBulkPriceField(field)}
                          className={`px-4 py-2 rounded-lg border transition ${bulkPriceField === field
                            ? 'bg-amber-600 border-amber-500 text-white'
                            : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                          {
                            {
                              precioLista: '💰 Precio Lista',
                              precioMayorista: '🏷️ Precio Mayorista',
                              precioOferta: '🔥 Precio Oferta',
                            }[field]
                          }
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Fila 2: Modo (porcentaje o importe) */}
                <div>
                  <label className="block text-sm font-medium text-amber-200 mb-2">
                    ¿Cómo querés modificarlo?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBulkMode('percentage')}
                      className={`px-4 py-2 rounded-lg border transition flex items-center justify-center gap-2 ${bulkMode === 'percentage'
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                      <FaPercent /> Porcentaje (%)
                    </button>
                    <button
                      onClick={() => setBulkMode('amount')}
                      className={`px-4 py-2 rounded-lg border transition flex items-center justify-center gap-2 ${bulkMode === 'amount'
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                      <FaDollarSign /> Importe fijo ($)
                    </button>
                  </div>
                </div>

                {/* Fila 3: Operación y valor */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-amber-200 mb-2">
                      Operación
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setBulkOperation('add')}
                        className={`px-3 py-2 rounded-lg border transition flex items-center justify-center gap-1 ${bulkOperation === 'add'
                          ? 'bg-green-600 border-green-500 text-white'
                          : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                          }`}
                      >
                        <FaPlusSquare /> Sumar
                      </button>
                      <button
                        onClick={() => setBulkOperation('subtract')}
                        className={`px-3 py-2 rounded-lg border transition flex items-center justify-center gap-1 ${bulkOperation === 'subtract'
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                          }`}
                      >
                        <FaMinusSquare /> Restar
                      </button>
                    </div>
                  </div>

                  {/* 🆕 Checkbox para aplicar sobre precio original */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="applyToOriginal"
                      checked={applyToOriginal}
                      onChange={(e) => setApplyToOriginal(e.target.checked)}
                      className="w-4 h-4 text-amber-600 bg-gray-700 border-gray-600 rounded focus:ring-amber-500"
                    />
                    <label htmlFor="applyToOriginal" className="text-sm text-amber-200">
                      Aplicar sobre precio original (ignorar cambios manuales pendientes)
                    </label>
                  </div>
                  

                  <div>
                    <label className="block text-sm font-medium text-amber-200 mb-2">
                      Valor {bulkMode === 'percentage' ? '(%)' : '($)'}
                    </label>
                    <input
                      type="text"
                      value={bulkValue}
                      onChange={(e) =>
                        setBulkValue(formatArgentineInput(e.target.value))
                      }
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
                      <FaCheckSquare />
                      Aplicar a {selectedIds.size} producto(s)
                    </button>
                  </div>
                </div>

                {/* Preview de cambios */}
                {bulkPreview && bulkPreview.length > 0 && (
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                    <p className="text-sm text-amber-200 font-medium mb-2">
                      👁️ Vista previa de los cambios:
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {bulkPreview.map(({ product, originalPrice, newPrice, diff }) => (
                        <div
                          key={product._id}
                          className="flex items-center justify-between text-xs bg-gray-800/50 rounded px-3 py-1.5"
                        >
                          <span className="text-gray-300 truncate flex-1">
                            {product.nombre}
                          </span>
                          <span className="text-gray-500 mx-2">
                            {originalPrice !== null ? formatARS(originalPrice) : '—'}
                          </span>
                          <span className="text-gray-500 mx-1">→</span>
                          <span className="text-white font-semibold mx-2">
                            {formatARS(newPrice)}
                          </span>
                          <span
                            className={`font-bold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-400'
                              }`}
                          >
                            {diff > 0 ? '+' : ''}
                            {formatARS(diff)}
                          </span>
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
          <div className="mb-6 flex justify-end">
            <button
              onClick={saveAllChanges}
              disabled={savingAll}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
            >
              <FaSave />
              {savingAll
                ? 'Guardando...'
                : `Guardar todos los cambios (${Object.keys(editingPrices).filter(
                  (id) => Object.keys(editingPrices[id]).length > 0
                ).length
                })`}
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
                    {/* 🆕 Checkbox "Seleccionar todos" */}
                    <th className="text-center py-3 px-2 w-12">
                      <button
                        onClick={toggleSelectAll}
                        className="text-amber-400 hover:text-amber-300 transition"
                        title={
                          selectedIds.size === products.length
                            ? 'Deseleccionar todos'
                            : 'Seleccionar todos'
                        }
                      >
                        {selectedIds.size === products.length ? (
                          <FaCheckSquare size={20} />
                        ) : selectedIds.size > 0 ? (
                          <div className="relative">
                            <FaSquare size={20} className="text-gray-500" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 bg-amber-400 rounded-sm"></div>
                            </div>
                          </div>
                        ) : (
                          <FaSquare size={20} className="text-gray-500" />
                        )}
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
                    const isEditing =
                      editingPrices[product._id] &&
                      Object.keys(editingPrices[product._id]).length > 0;
                    const isSaving = savingIds.has(product._id);
                    const isSelected = selectedIds.has(product._id);

                    return (
                      <tr
                        key={product._id}
                        className={`hover:bg-gray-750 transition ${isEditing ? 'bg-amber-900/10' : ''
                          } ${isSelected ? 'bg-blue-900/10' : ''}`}
                      >
                        {/* 🆕 Checkbox individual */}
                        <td className="text-center py-3 px-2">
                          <button
                            onClick={() => toggleSelectProduct(product._id)}
                            className={`transition ${isSelected
                              ? 'text-amber-400'
                              : 'text-gray-500 hover:text-gray-300'
                              }`}
                          >
                            {isSelected ? (
                              <FaCheckSquare size={18} />
                            ) : (
                              <FaSquare size={18} />
                            )}
                          </button>
                        </td>

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
                            {isEditing &&
                              editingPrices[product._id]?.precioLista !== undefined && (
                                <span
                                  className={`text-xs font-medium ${getPriceDiff(product, 'precioLista') > 0
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
                            {isEditing &&
                              editingPrices[product._id]?.precioMayorista !== undefined && (
                                <span
                                  className={`text-xs font-medium ${getPriceDiff(product, 'precioMayorista') > 0
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
                            {isEditing &&
                              editingPrices[product._id]?.precioOferta !== undefined && (
                                <span
                                  className={`text-xs font-medium ${getPriceDiff(product, 'precioOferta') > 0
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



      </div>
    </div>
  );
}