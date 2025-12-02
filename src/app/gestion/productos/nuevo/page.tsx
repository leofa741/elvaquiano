// app/gestion/productos/nuevo/page.tsx
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

export default function NuevoProductoPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Estado del formulario – ✅ incluye cantidadUnidad
    const [form, setForm] = useState({
        nombre: '',
        categoria: '',
        unidad: 'kg',
        cantidadUnidad: 1,
        precioMayorista: '',
        precioMinorista: '',
    });

    const [stock, setStock] = useState<StockEntry[]>([{ deposito: '', cantidad: 0 }]);
    const [lotes, setLotes] = useState<LoteEntry[]>([{ lote: '', vencimiento: '', cantidad: 0, deposito: '' }]);

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

    if (!isAuthorized) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'cantidadUnidad' || name === 'precioMayorista' || name === 'precioMinorista') {
            setForm(prev => ({
                ...prev,
                [name]: value === '' ? '' : parseFloat(value)
            }));
        }
        else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    // Gestión de stock
    const handleStockChange = (index: number, field: keyof StockEntry, value: string | number) => {
        const newStock = [...stock];
        newStock[index] = { ...newStock[index], [field]: value };
        setStock(newStock);
    };

    const addStockField = () => {
        setStock([...stock, { deposito: '', cantidad: 0 }]);
    };

    const removeStockField = (index: number) => {
        if (stock.length > 1) {
            setStock(stock.filter((_, i) => i !== index));
        }
    };

    // Gestión de lotes
    const handleLoteChange = (index: number, field: keyof LoteEntry, value: string | number) => {
        const newLotes = [...lotes];
        newLotes[index] = { ...newLotes[index], [field]: value };
        setLotes(newLotes);
    };

    const addLoteField = () => {
        setLotes([...lotes, { lote: '', vencimiento: '', cantidad: 0, deposito: '' }]);
    };

    const removeLoteField = (index: number) => {
        if (lotes.length > 1) {
            setLotes(lotes.filter((_, i) => i !== index));
        }
    };

    // Subida de imagen
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // Validación completa
    const validateForm = (): boolean => {
        if (!form.nombre.trim() || !form.categoria.trim()) {
            toast.error('Nombre y categoría son obligatorios.');
            return false;
        }

        if (form.cantidadUnidad <= 0) {
            toast.error('La cantidad por unidad debe ser mayor a 0.');
            return false;
        }

        const pm = form.precioMayorista as unknown as number;
        const pn = form.precioMinorista as unknown as number;
        if (pm <= 0 || pn <= 0) {
            toast.error('Precios deben ser mayores a 0.');
            return false;
        }

        if (pm > pn) {
            toast.error('El precio minorista no puede ser menor que el mayorista.');
            return false;
        }

        for (const s of stock) {
            if (!s.deposito.trim() || s.cantidad <= 0) {
                toast.error('Todos los depósitos deben tener nombre y cantidad > 0.');
                return false;
            }
        }

        for (const l of lotes) {
            // Si el lote está completamente vacío → ignorarlo
            const isEmpty =
                !l.lote.trim() &&
                !l.vencimiento &&
                !l.deposito.trim() &&
                (!l.cantidad || l.cantidad === 0);

            if (isEmpty) {
                continue; // no validar
            }

            // Si hay datos cargados → validar que estén completos
            const hasSomeData =
                l.lote.trim() ||
                l.vencimiento ||
                l.deposito.trim() ||
                (l.cantidad && l.cantidad > 0);

            if (hasSomeData) {
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
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error al subir imagen');
                imageUrl = data.url;
            } catch (err: any) {
                toast.error(err.message || 'Error al subir la imagen');
                setLoading(false);
                return;
            }
        }

        try {
            // 🔥 Filtramos lotes vacíos antes de enviarlos al servidor
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
                precioMayorista: form.precioMayorista,
                precioMinorista: form.precioMinorista,
                stock,
                lotes: lotesFiltrados,
                imagen: imageUrl || null,
            };


            const res = await fetch('/api/gestion/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData),
            });

            if (res.ok) {
                toast.success('✅ Producto creado con éxito');
                router.push('/gestion/productos');
            } else {
                const error = await res.json();
                toast.error(error.error || 'Error al crear el producto');
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

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
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Categoría *</label>
                            <input
                                type="text"
                                name="categoria"
                                value={form.categoria}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Unidad</label>
                            <select
                                name="unidad"
                                value={form.unidad}
                                onChange={handleChange}
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
                                type="number"
                                name="cantidadUnidad"
                                value={form.cantidadUnidad}
                                onChange={handleChange}
                                min="0.001"
                                step="0.001"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Ej: 1 → 1 kg, 0.5 → medio kg, 0.25 → 250 g
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Precio Mayorista *</label>
                            <input
                                type="number"
                                name="precioMayorista"
                                value={form.precioMayorista}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Precio Minorista *</label>
                            <input
                                type="number"
                                name="precioMinorista"
                                value={form.precioMinorista}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                required
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
                                    <input
                                        type="text"
                                        placeholder="Nombre del depósito"
                                        value={s.deposito}
                                        onChange={(e) => handleStockChange(i, 'deposito', e.target.value)}
                                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                                    />
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
                                    <input
                                        type="text"
                                        placeholder="Depósito"
                                        value={l.deposito}
                                        onChange={(e) => handleLoteChange(i, 'deposito', e.target.value)}
                                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                                    />
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