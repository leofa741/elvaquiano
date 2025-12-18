'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';

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

interface Product {
  _id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidadUnidad: number;
  precioLista: number;
  precioMayorista: number;
  precioMinorista: number;
  stock: StockEntry[];
  lotes: LoteEntry[];
  activo: boolean;
  imagen?: string | null;
}

export default function EditProductPage() {
  const { id } = useParams() as { id?: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);

  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    unidad: 'kg',
    cantidadUnidad: 1,
    precioLista: 0,
    precioMayorista: 0,
    precioMinorista: 0,
    imagen: '' as string | null,
  });

  const [displayPrecios, setDisplayPrecios] = useState({
    precioLista: '',
    precioMayorista: '',
    precioMinorista: '',
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [stock, setStock] = useState<StockEntry[]>([{ deposito: '', cantidad: 0 }]);
  const [lotes, setLotes] = useState<LoteEntry[]>([
    { lote: '', vencimiento: '', cantidad: 0, deposito: '' },
  ]);

  // ✅ Nuevo estado: cantidades a sumar
  const [stockToAdd, setStockToAdd] = useState<number[]>([]);

  // Modo para depósitos: null = select, string = valor personalizado
  const [stockDepositMode, setStockDepositMode] = useState<(string | null)[]>([null]);
  const [loteDepositMode, setLoteDepositMode] = useState<(string | null)[]>([null]);

  // Cargar depósitos desde la API
  const [depositos, setDepositos] = useState<string[]>([]);
  const [loadingDepositos, setLoadingDepositos] = useState(true);

  useEffect(() => {
    const fetchDepositos = async () => {
      try {
        const res = await fetch('/api/gestion/depositos');
        if (res.ok) {
          const data = await res.json();
          setDepositos(Array.isArray(data) ? data : []);
        } else {
          toast.error('Error al cargar depósitos');
          setDepositos([]);
        }
      } catch (err) {
        console.error(err);
        toast.error('Error de red al cargar depósitos');
        setDepositos([]);
      } finally {
        setLoadingDepositos(false);
      }
    };

    fetchDepositos();
  }, []);

  // Cargar producto
  useEffect(() => {
    if (!id) {
      toast.error('ID de producto no válido');
      router.push('/gestion/productos');
      return;
    }

    const loadProduct = async () => {
      try {
        const res = await fetch(`/api/gestion/productos/${id}`);
        if (!res.ok) {
          toast.error('Producto no encontrado');
          router.push('/gestion/productos');
          return;
        }

        const data: Product = await res.json();
        setProduct(data);

        setForm({
          nombre: data.nombre || '',
          categoria: data.categoria || '',
          unidad: data.unidad || 'kg',
          cantidadUnidad: data.cantidadUnidad || 1,
          precioLista: data.precioLista ?? 0,
          precioMayorista: data.precioMayorista ?? 0,
          precioMinorista: data.precioMinorista ?? 0,
          imagen: data.imagen || null,
        });

        // Formatear precios para display
        setDisplayPrecios({
          precioLista: data.precioLista ? data.precioLista.toLocaleString('es-AR') : '',
          precioMayorista: data.precioMayorista ? data.precioMayorista.toLocaleString('es-AR') : '',
          precioMinorista: data.precioMinorista ? data.precioMinorista.toLocaleString('es-AR') : '',
        });

        setPreview(data.imagen || null);

        // Inicializar stock, modos y cantidades a sumar
        const initialStock = data.stock?.length
          ? data.stock.map((s) => ({ ...s }))
          : [{ deposito: '', cantidad: 0 }];
        setStock(initialStock);
        setStockDepositMode(initialStock.map(() => null));
        setStockToAdd(initialStock.map(() => 0)); // ✅ inicializar con ceros
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar el producto');
        router.push('/gestion/productos');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePriceChange = (name: string, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '');
    const numericValue = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);
    setForm((prev) => ({
      ...prev,
      [name]: numericValue,
    }));
    const formatted = digitsOnly === '' ? '' : numericValue.toLocaleString('es-AR');
    setDisplayPrecios((prev) => ({
      ...prev,
      [name]: formatted,
    }));
  };

  // === IMAGEN ===
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // === STOCK ===
  const handleStockChange = (index: number, field: keyof StockEntry, value: string | number) => {
    const newStock = [...stock];
    newStock[index] = { ...newStock[index], [field]: value };
    setStock(newStock);
  };

  const handleStockToAddChange = (index: number, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    const newStockToAdd = [...stockToAdd];
    newStockToAdd[index] = numValue;
    setStockToAdd(newStockToAdd);
  };

  const addStockField = () => {
    setStock([...stock, { deposito: '', cantidad: 0 }]);
    setStockDepositMode(prev => [...prev, null]);
    setStockToAdd(prev => [...prev, 0]); // ✅
  };

  const removeStockField = (index: number) => {
    if (stock.length > 1) {
      setStock(stock.filter((_, i) => i !== index));
      setStockDepositMode(prev => prev.filter((_, i) => i !== index));
      setStockToAdd(prev => prev.filter((_, i) => i !== index)); // ✅
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

  // === LOTES ===
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

  // === VALIDACIÓN ===
  const validateForm = (): boolean => {
    if (!form.nombre.trim() || !form.categoria.trim()) {
      toast.error('Nombre y categoría son obligatorios.');
      return false;
    }

    if (form.cantidadUnidad <= 0) {
      toast.error('La cantidad por unidad debe ser mayor a 0.');
      return false;
    }

    if (form.precioLista <= 0) {
      toast.error('El precio de lista debe ser mayor a 0.');
      return false;
    }

    if (form.precioLista > form.precioMayorista) {
      toast.error('El precio mayorista no puede ser menor que el precio de lista.');
      return false;
    }

    if (form.precioMayorista > form.precioMinorista) {
      toast.error('El precio minorista no puede ser menor que el mayorista.');
      return false;
    }

    for (const s of stock) {
      if (!s.deposito.trim()) {
        toast.error('Todos los depósitos deben tener nombre.');
        return false;
      }
      // Validar cantidad final (existente + a sumar)
      const total = s.cantidad + (stockToAdd[stock.indexOf(s)] || 0);
      if (total <= 0) {
        toast.error('El stock total debe ser mayor a 0.');
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

  // === GUARDAR ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!validateForm()) return;

    setSaving(true);
    let imageUrl = form.imagen || null;

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
        setSaving(false);
        return;
      }
    }

    try {
      const lotesFiltrados = lotes.filter(
        (l) =>
          l.lote.trim() ||
          l.vencimiento ||
          l.deposito.trim() ||
          (l.cantidad && l.cantidad > 0)
      );

      // ✅ Actualizar stock: sumar las cantidades
      const updatedStock = stock.map((item, i) => ({
        ...item,
        cantidad: item.cantidad + (stockToAdd[i] || 0),
      }));

      const payload = {
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim(),
        unidad: form.unidad,
        cantidadUnidad: form.cantidadUnidad,
        precioLista: form.precioLista,
        precioMayorista: form.precioMayorista,
        precioMinorista: form.precioMinorista,
        stock: updatedStock, // ✅
        lotes: lotesFiltrados,
        imagen: imageUrl,
      };

      const res = await fetch(`/api/gestion/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('✅ Producto actualizado con éxito');
        router.push('/gestion/productos');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al actualizar el producto');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error de conexión con el servidor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-white">Cargando producto...</div>;
  if (!product) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/gestion/productos" className="text-amber-500 hover:text-amber-400">
          ← Volver a productos
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold ">Editar Producto</h1>
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
              {preview && (
                <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border border-gray-600">
                  <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Cantidad por unidad *
              </label>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Precio de Lista (costo) *
              </label>
              <input
                type="text"
                name="precioLista"
                value={displayPrecios.precioLista}
                onChange={(e) => handlePriceChange('precioLista', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Precio al que se adquiere el producto.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Precio Mayorista *
              </label>
              <input
                type="text"
                name="precioMayorista"
                value={displayPrecios.precioMayorista}
                onChange={(e) => handlePriceChange('precioMayorista', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Precio Minorista *
              </label>
              <input
                type="text"
                name="precioMinorista"
                value={displayPrecios.precioMinorista}
                onChange={(e) => handlePriceChange('precioMinorista', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Stock por depósito */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Stock por depósito *
              </label>
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
                <div key={i} className="flex gap-2 items-start">
                  {/* Depósito */}
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
                        className="px-2 bg-gray-600 text-white rounded self-end"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <select
                      value={s.deposito}
                      onChange={(e) => handleStockDepositoSelect(i, e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none"
                      disabled={loadingDepositos}
                    >
                      <option value="">Seleccionar depósito</option>
                      {depositos.map(dep => (
                        <option key={dep} value={dep}>{dep}</option>
                      ))}
                      <option value="__OTRO__">➕ Agregar nuevo depósito</option>
                    </select>
                  )}

                  {/* Cantidad actual (solo lectura) */}
                  <div className="w-24">
                    <label className="block text-xs text-gray-400">Actual</label>
                    <input
                      type="text"
                      value={s.cantidad}
                      readOnly
                      className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-300 text-center"
                    />
                  </div>

                  {/* Agregar cantidad */}
                  <div className="w-24">
                    <label className="block text-xs text-gray-400">+ Agregar</label>
                    <input
                      type="number"
                      value={stockToAdd[i] || ''}
                      onChange={(e) => handleStockToAddChange(i, e.target.value)}
                      min="0"
                      className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-center"
                      placeholder="0"
                    />
                  </div>

                  {stock.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStockField(i)}
                      className="mt-6 px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg"
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
              <label className="block text-sm font-medium text-gray-300">
                Lotes (con vencimiento) *
              </label>
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
                  {/* Depósito del lote */}
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
                      disabled={loadingDepositos}
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
              disabled={saving}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-70"
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    ></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
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