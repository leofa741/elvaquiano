'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import Link from 'next/link';

// Tipos
interface StockEntry {
    deposito: string;
    cantidad: number;
}

interface LoteEntry {
    lote: string;
    vencimiento: string; // YYYY-MM-DD
    cantidad: number;
    deposito: string;
}

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

// ✅ Utilidad segura para decodificar JWT (Base64URL → JSON)
const parseJwt = (token: string): any => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        throw new Error('Token JWT inválido');
    }
};

export default function NuevoProductoPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [displayCantidad, setDisplayCantidad] = useState('');

    const [form, setForm] = useState({
        nombre: '',
        categoria: '',
        unidad: 'kg',
        cantidadUnidad: 1,
        precioLista: '' as number | '',
        precioMayorista: '' as number | '',
        precioOferta: '' as number | '',
    });

    const [categoriaMode, setCategoriaMode] = useState<'select' | 'custom'>('select');

    const [stock, setStock] = useState<StockEntry[]>([{ deposito: '', cantidad: 0 }]);
    const [lotes, setLotes] = useState<LoteEntry[]>([{ lote: '', vencimiento: '', cantidad: 0, deposito: '' }]);

    const [displayPrecios, setDisplayPrecios] = useState({
        precioLista: '',
        precioMayorista: '',
        precioOferta: '',
    });

    const [depositos, setDepositos] = useState<string[]>([]);
    const [categorias, setCategorias] = useState<string[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true);

    const [stockDepositMode, setStockDepositMode] = useState<(string | null)[]>([null]);
    const [loteDepositMode, setLoteDepositMode] = useState<(string | null)[]>([null]);

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
                toast.error('Acceso denegado: no hay sesión activa');
                router.push('/');
                return;
            }

            try {
                const payload = parseJwt(token);
                if (!['admin', 'superadmin'].includes(payload.role)) {
                    toast.error('Acceso restringido a administradores');
                    router.push('/');
                    return;
                }
                setIsAuthorized(true);
            } catch (err: any) {
                console.error('Error al validar el token:', err);
                toast.error('Sesión inválida o expirada');
                router.push('/');
            }
        };

        validateAccess();
    }, [status, session, router]);

    // 📥 Cargar depósitos y categorías
    useEffect(() => {
        const fetchOptions = async () => {
            if (!isAuthorized) return;
            setLoadingOptions(true);
            try {
                const resDepositos = await fetch('/api/gestion/depositos');
                const resCategorias = await fetch('/api/gestion/categorias');

                let depositosData = [];
                let categoriasData = [];

                if (resDepositos.ok) {
                    try {
                        depositosData = await resDepositos.json();
                    } catch (e) {
                        console.warn('Respuesta no JSON en /api/gestion/depositos');
                    }
                }

                if (resCategorias.ok) {
                    try {
                        categoriasData = await resCategorias.json();
                    } catch (e) {
                        console.warn('Respuesta no JSON en /api/gestion/categorias');
                    }
                }

                setDepositos(Array.isArray(depositosData) ? depositosData : []);
                setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
            } catch (err) {
                console.error('Error fetching options:', err);
                toast.error('Error al cargar las opciones de depósitos o categorías');
                setDepositos([]);
                setCategorias([]);
            } finally {
                setLoadingOptions(false);
            }
        };

        fetchOptions();
    }, [isAuthorized]);

    const handleCantidadChange = (rawValue: string) => {
        // Permitir vacío o números válidos
        if (rawValue === '') {
            setDisplayCantidad('');
            setForm(prev => ({ ...prev, cantidadUnidad: 0 })); // temporal, se validará al final
            return;
        }

        // Eliminar caracteres no numéricos ni puntos
        let clean = rawValue.replace(/[^\d.]/g, '');

        // Evitar múltiples puntos
        const dotCount = (clean.match(/\./g) || []).length;
        if (dotCount > 1) {
            clean = clean.slice(0, clean.lastIndexOf('.'));
        }

        // Si empieza con punto, prependemos "0"
        if (clean.startsWith('.')) {
            clean = '0' + clean;
        }

        setDisplayCantidad(clean);

        const num = parseFloat(clean);
        if (!isNaN(num) && num > 0) {
            setForm(prev => ({ ...prev, cantidadUnidad: num }));
        } else {
            setForm(prev => ({ ...prev, cantidadUnidad: 0 })); // inválido, pero lo validaremos al submit
        }
    };

    // ✅ Mientras escribe: mostrar tal como lo ingresa
    const handlePriceChange = (name: keyof typeof form, rawValue: string) => {
        const cleaned = formatArgentineInput(rawValue);
        setDisplayPrecios(prev => ({ ...prev, [name]: cleaned }));
        const numericValue = parseArgentineNumber(cleaned);
        setForm(prev => ({
            ...prev,
            [name]: numericValue ?? '',
        }));
    };

    // ✅ Al salir: formatear correctamente
    const handlePriceBlur = (name: keyof typeof form) => {
        const numericValue = form[name];
        if (typeof numericValue === 'number') {
            setDisplayPrecios(prev => ({ ...prev, [name]: formatArgentineFinal(numericValue) }));
        } else {
            setDisplayPrecios(prev => ({ ...prev, [name]: '' }));
        }
    };

    // === Gestión de stock y lotes ===
    const handleStockChange = (index: number, field: keyof StockEntry, value: string | number) => {
        const newStock = [...stock];
        newStock[index] = { ...newStock[index], [field]: value };
        setStock(newStock);
    };

    const addStockField = () => {
        setStock([...stock, { deposito: '', cantidad: 0 }]);
        setStockDepositMode(prev => [...prev, null]);
    };

    const removeStockField = (index: number) => {
        if (stock.length > 1) {
            setStock(stock.filter((_, i) => i !== index));
            setStockDepositMode(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleStockDepositoSelect = (index: number, value: string) => {
        if (value === '__OTRO__') {
            setStockDepositMode(prev => {
                const newArr = [...prev];
                newArr[index] = '';
                return newArr;
            });
        } else {
            handleStockChange(index, 'deposito', value);
            setStockDepositMode(prev => {
                const newArr = [...prev];
                newArr[index] = null;
                return newArr;
            });
        }
    };

    const handleStockDepositoCustomChange = (index: number, value: string) => {
        setStockDepositMode(prev => {
            const newArr = [...prev];
            newArr[index] = value;
            return newArr;
        });
        handleStockChange(index, 'deposito', value);
    };

    const handleLoteChange = (index: number, field: keyof LoteEntry, value: string | number) => {
        const newLotes = [...lotes];
        newLotes[index] = { ...newLotes[index], [field]: value };
        setLotes(newLotes);
    };

    const addLoteField = () => {
        setLotes([...lotes, { lote: '', vencimiento: '', cantidad: 0, deposito: '' }]);
        setLoteDepositMode(prev => [...prev, null]);
    };

    const removeLoteField = (index: number) => {
        if (lotes.length > 1) {
            setLotes(lotes.filter((_, i) => i !== index));
            setLoteDepositMode(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleLoteDepositoSelect = (index: number, value: string) => {
        if (value === '__OTRO__') {
            setLoteDepositMode(prev => {
                const newArr = [...prev];
                newArr[index] = '';
                return newArr;
            });
        } else {
            handleLoteChange(index, 'deposito', value);
            setLoteDepositMode(prev => {
                const newArr = [...prev];
                newArr[index] = null;
                return newArr;
            });
        }
    };

    const handleLoteDepositoCustomChange = (index: number, value: string) => {
        setLoteDepositMode(prev => {
            const newArr = [...prev];
            newArr[index] = value;
            return newArr;
        });
        handleLoteChange(index, 'deposito', value);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const validateForm = (): boolean => {
        if (!form.nombre.trim() || !form.categoria.trim()) {
            toast.error('Nombre y categoría son obligatorios.');
            return false;
        }

        if (form.cantidadUnidad <= 0) {
            toast.error('La cantidad por unidad debe ser mayor a 0.');
            return false;
        }

        const pl = form.precioLista;
        const pm = form.precioMayorista;

        // ✅ precioLista es opcional - si no existe, usamos 0.00
        if (pl !== '' && (typeof pl !== 'number' || pl <= 0)) {
            toast.error('El precio de lista debe ser mayor a 0.');
            return false;
        }


        if (typeof pm !== 'number' || pm <= 0) {
            toast.error('El precio mayorista debe ser mayor a 0.');
            return false;
        }

        const po = form.precioOferta;
        if (po !== '' && (typeof po !== 'number' || po < 0)) {
            toast.error('El precio de oferta debe ser mayor o igual a 0.'); 
            return false;
        }

        


        for (const s of stock) {
            if (!s.deposito.trim() || s.cantidad <= 0) {
                toast.error('Todos los depósitos deben tener nombre y cantidad > 0.');
                return false;
            }
        }

        for (const l of lotes) {
            const isEmpty =
                !l.lote.trim() &&
                !l.vencimiento &&
                !l.deposito.trim() &&
                (!l.cantidad || l.cantidad === 0);

            if (isEmpty) continue;

            if (!l.lote.trim()) {
                toast.error("El número de lote es obligatorio si vas a cargar un lote.");
                return false;
            }
            if (!l.vencimiento) {
                toast.error("La fecha de vencimiento es obligatoria si vas a cargar un lote.");
                return false;
            }
            if (!l.deposito.trim()) {
                toast.error("El depósito es obligatorio si vas a cargar un lote.");
                return false;
            }
            if (!l.cantidad || l.cantidad <= 0) {
                toast.error("La cantidad del lote debe ser mayor a cero.");
                return false;
            }
            if (new Date(l.vencimiento) <= new Date()) {
                toast.error("La fecha de vencimiento debe ser futura.");
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        let imageUrl = '';

        if (imageFile) {
            try {
                const formData = new FormData();
                formData.append('image', imageFile);
                const res = await fetch('/api/uploadImage', {
                    method: 'POST',
                    body: formData,
                });

                let uploadData;
                try {
                    uploadData = await res.json();
                } catch (err) {
                    console.error('Error al parsear respuesta de upload:', err);
                    throw new Error('El servidor no respondió con un formato válido al subir la imagen.');
                }

                if (!res.ok) throw new Error(uploadData.error || 'Error desconocido al subir imagen');
                imageUrl = uploadData.url;
            } catch (err: any) {
                toast.error(err.message || 'Error al subir la imagen');
                setLoading(false);
                return;
            }
        }

        try {
            const lotesFiltrados = lotes.filter(l =>
                l.lote.trim() ||
                l.vencimiento ||
                l.deposito.trim() ||
                (l.cantidad && l.cantidad > 0)
            );

            const productData = {
                nombre: form.nombre.trim(),
                categoria: form.categoria.trim(),
                unidad: form.unidad,
                cantidadUnidad: form.cantidadUnidad,
                precioLista: typeof form.precioLista === 'number' ? form.precioLista : 0.00, // ✅ por defecto 0.00
                precioMayorista: form.precioMayorista as number,
                precioOferta: typeof form.precioOferta === 'number' && form.precioOferta > 0
                    ? form.precioOferta
                    : form.precioMayorista, // ← Si no hay oferta, usamos el precio mayorista
                stock,
                lotes: lotesFiltrados,
                imagen: imageUrl || null,
            };

            const res = await fetch('/api/gestion/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData),
            });

            let responseData;
            try {
                responseData = await res.json();
            } catch (jsonErr) {
                console.error('Error al parsear respuesta del backend:', jsonErr);
                throw new Error('El servidor devolvió una respuesta no válida.');
            }

            if (res.ok) {
                toast.success('✅ Producto creado con éxito');
                router.push('/gestion/productos');
            } else {
                toast.error(responseData.error || 'Error al crear el producto');
            }
        } catch (err: any) {
            console.error('Error en handleSubmit:', err);
            toast.error(err.message || 'Error de conexión o del servidor');
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/gestion/productos" className="text-amber-500 hover:text-amber-400">
                    ← Volver a productos
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold ">Nuevo Producto</h1>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Imagen */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Imagen del producto (opcional)
                        </label>
                        <div className="flex items-start gap-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-amber-700 file:text-white hover:file:bg-amber-800"
                            />
                            {imagePreview && (
                                <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border border-gray-600">
                                    <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Datos básicos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                            <input
                                type="text"
                                name="nombre"
                                value={form.nombre}
                                onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Categoría *</label>
                            {categoriaMode === 'select' ? (
                                <div className="flex gap-1">
                                    <select
                                        value={form.categoria}
                                        onChange={(e) => {
                                            if (e.target.value === '__OTRO__') {
                                                setCategoriaMode('custom');
                                                setForm(prev => ({ ...prev, categoria: '' }));
                                            } else {
                                                setForm(prev => ({ ...prev, categoria: e.target.value }));
                                            }
                                        }}
                                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        disabled={loadingOptions}
                                    >
                                        <option value="">Seleccionar categoría</option>
                                        {categorias.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="__OTRO__">➕ Agregar una nueva categoría</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setCategoriaMode('select')}
                                        className="px-2 bg-gray-600 text-white rounded self-end"
                                    >
                                        X
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-1">
                                    <input
                                        type="text"
                                        name="categoria"
                                        value={form.categoria}
                                        onChange={(e) => setForm(prev => ({ ...prev, categoria: e.target.value }))}
                                        placeholder="Nueva categoría"
                                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setCategoriaMode('select')}
                                        className="px-2 bg-gray-600 text-white rounded self-end"
                                    >
                                        X
                                    </button>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Unidad</label>
                            <select
                                name="unidad"
                                value={form.unidad}
                                onChange={(e) => setForm(prev => ({ ...prev, unidad: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                                <option value="kg">Kilogramo (kg)</option>
                                <option value="caja">Caja</option>
                                <option value="pack">Pack</option>
                                <option value="unidad">Unidad</option>
                                <option value="litro">Litro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Cantidad por unidad *</label>
                            <input
                                type="text"
                                value={displayCantidad}
                                onChange={(e) => handleCantidadChange(e.target.value)}
                                placeholder="Ej: 1, 0.5, 0.25"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                inputMode="decimal" // ← teclado numérico en móviles
                                pattern="[0-9]*[.,]?[0-9]*" // ← ayuda en algunos navegadores
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Ej: 1 → 1 kg, 0.5 → medio kg, 0.25 → 250 g
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Precio de Lista *</label>
                            <input
                                type="text"
                                name="precioLista"
                                value={displayPrecios.precioLista}
                                onChange={(e) => handlePriceChange('precioLista', e.target.value)}
                                onBlur={() => handlePriceBlur('precioLista')}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Precio Mayorista *</label>
                            <input
                                type="text"
                                name="precioMayorista"
                                value={displayPrecios.precioMayorista}
                                onChange={(e) => handlePriceChange('precioMayorista', e.target.value)}
                                onBlur={() => handlePriceBlur('precioMayorista')}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Precio Oferta</label>
                            <input
                                type="text"
                                name="precioOferta"
                                value={displayPrecios.precioOferta}
                                onChange={(e) => handlePriceChange('precioOferta', e.target.value)}
                                onBlur={() => handlePriceBlur('precioOferta')}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>


                    </div>

                    {/* Stock por depósito */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-300">Stock por depósito *</label>
                            <button
                                type="button"
                                onClick={addStockField}
                                className="text-xs bg-gray-700 hover:bg-gray-600 text-amber-400 px-2 py-1 rounded"
                            >
                                + Agregar depósito
                            </button>
                        </div>
                        <div className="space-y-3">
                            {stock.map((s, i) => (
                                <div key={i} className="flex gap-2">
                                    {stockDepositMode[i] !== null ? (
                                        <div className="flex-1 flex gap-1">
                                            <input
                                                type="text"
                                                placeholder="Nuevo depósito"
                                                value={stockDepositMode[i]}
                                                onChange={(e) => handleStockDepositoCustomChange(i, e.target.value)}
                                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setStockDepositMode(prev => {
                                                    const newArr = [...prev];
                                                    newArr[i] = null;
                                                    return newArr;
                                                })}
                                                className="px-2 bg-gray-600 text-white rounded"
                                            >
                                                X
                                            </button>
                                        </div>
                                    ) : (
                                        <select
                                            value={s.deposito}
                                            onChange={(e) => handleStockDepositoSelect(i, e.target.value)}
                                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                                            disabled={loadingOptions}
                                        >
                                            <option value="">Seleccionar depósito</option>
                                            {depositos.map(dep => (
                                                <option key={dep} value={dep}>{dep}</option>
                                            ))}
                                            <option value="__OTRO__">➕ Agregar nuevo depósito</option>
                                        </select>
                                    )}
                                    <input
                                        type="number"
                                        placeholder="Cantidad"
                                        value={s.cantidad || ''}
                                        onChange={(e) => handleStockChange(i, 'cantidad', Number(e.target.value))}
                                        min="1"
                                        className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                                    />
                                    {stock.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeStockField(i)}
                                            className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg"
                                        >
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Lotes */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-300">Lotes (con vencimiento) *</label>
                            <button
                                type="button"
                                onClick={addLoteField}
                                className="text-xs bg-gray-700 hover:bg-gray-600 text-amber-400 px-2 py-1 rounded"
                            >
                                + Agregar lote
                            </button>
                        </div>
                        <div className="space-y-3">
                            {lotes.map((l, i) => (
                                <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <input
                                        type="text"
                                        placeholder="N° de lote"
                                        value={l.lote}
                                        onChange={(e) => handleLoteChange(i, 'lote', e.target.value)}
                                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                                    />
                                    <input
                                        type="date"
                                        value={l.vencimiento}
                                        onChange={(e) => handleLoteChange(i, 'vencimiento', e.target.value)}
                                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                                    />
                                    {loteDepositMode[i] !== null ? (
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                placeholder="Nuevo depósito"
                                                value={loteDepositMode[i]}
                                                onChange={(e) => handleLoteDepositoCustomChange(i, e.target.value)}
                                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setLoteDepositMode(prev => {
                                                    const newArr = [...prev];
                                                    newArr[i] = null;
                                                    return newArr;
                                                })}
                                                className="px-2 bg-gray-600 text-white rounded"
                                            >
                                                X
                                            </button>
                                        </div>
                                    ) : (
                                        <select
                                            value={l.deposito}
                                            onChange={(e) => handleLoteDepositoSelect(i, e.target.value)}
                                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                                            disabled={loadingOptions}
                                        >
                                            <option value="">Seleccionar depósito</option>
                                            {depositos.map(dep => (
                                                <option key={dep} value={dep}>{dep}</option>
                                            ))}
                                            <option value="__OTRO__">➕ Agregar nuevo</option>
                                        </select>
                                    )}
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Cantidad"
                                            value={l.cantidad || ''}
                                            onChange={(e) => handleLoteChange(i, 'cantidad', Number(e.target.value))}
                                            min="1"
                                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                                        />
                                        {lotes.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeLoteField(i)}
                                                className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg"
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-70"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                    </svg>
                                    Creando...
                                </>
                            ) : (
                                'Crear Producto'
                            )}
                        </button>
                        <Link
                            href="/gestion/productos"
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg text-center transition"
                        >
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}