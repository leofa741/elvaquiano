'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';

// Tipos (duplicá los tuyos si preferís)
interface StockEntry {
  deposito: string;
  cantidad: number;
}
interface LoteEntry {
  lote: string;
  vencimiento: string;
  cantidad: number;
  deposito: string;
}
interface Product {
  _id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidadUnidad: number;
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

  // Form state
  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    unidad: 'kg',
    cantidadUnidad: 1,
    precioMayorista: 0,
    precioMinorista: 0,
    imagen: '' as string | null,
  });

  const [stock, setStock] = useState<StockEntry[]>([]);
  const [lotes, setLotes] = useState<LoteEntry[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/gestion/productos/${id}`);
        if (!res.ok) {
          toast.error('Producto no encontrado');
          router.push('/gestion/productos');
          return;
        }
        const data = await res.json();
        setProduct(data);

        // Prefill form and arrays
        setForm({
          nombre: data.nombre || '',
          categoria: data.categoria || '',
          unidad: data.unidad || 'kg',
          cantidadUnidad: Number(data.cantidadUnidad) || 1,
          precioMayorista: Number(data.precioMayorista) || 0,
          precioMinorista: Number(data.precioMinorista) || 0,
          imagen: data.imagen || null,
        });

        setStock(Array.isArray(data.stock) && data.stock.length ? data.stock : [{ deposito: '', cantidad: 0 }]);
        setLotes(Array.isArray(data.lotes) && data.lotes.length ? data.lotes : [{ lote: '', vencimiento: '', cantidad: 0, deposito: '' }]);
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar producto');
        router.push('/gestion/productos');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'cantidadUnidad' || name === 'precioMayorista' || name === 'precioMinorista') {
      setForm(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // stock handlers
  const handleStockChange = (index: number, field: keyof StockEntry, value: string | number) => {
    const s = [...stock];
    s[index] = { ...s[index], [field]: value };
    setStock(s);
  };
  const addStock = () => setStock(prev => [...prev, { deposito: '', cantidad: 0 }]);
  const removeStock = (i: number) => setStock(prev => prev.filter((_, idx) => idx !== i));

  // lotes handlers
  const handleLoteChange = (index: number, field: keyof LoteEntry, value: string | number) => {
    const l = [...lotes];
    l[index] = { ...l[index], [field]: value };
    setLotes(l);
  };
  const addLote = () => setLotes(prev => [...prev, { lote: '', vencimiento: '', cantidad: 0, deposito: '' }]);
  const removeLote = (i: number) => setLotes(prev => prev.filter((_, idx) => idx !== i));

  // limpia lotes vacíos (igual que en nuevo)
  const sanitizeLotes = (raw: LoteEntry[]) =>
    raw.filter(l =>
      (l.lote && l.lote.toString().trim()) ||
      (l.deposito && l.deposito.toString().trim()) ||
      (l.vencimiento) ||
      (l.cantidad && l.cantidad > 0)
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);

    try {
      // Validaciones mínimas (podés extender)
      if (!form.nombre.trim() || !form.categoria.trim()) {
        toast.error('Nombre y categoría son obligatorios');
        setSaving(false);
        return;
      }

      // Construir payload
      const payload = {
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim(),
        unidad: form.unidad,
        cantidadUnidad: Number(form.cantidadUnidad),
        precioMayorista: Number(form.precioMayorista),
        precioMinorista: Number(form.precioMinorista),
        stock: stock.filter(s => s.deposito.trim() || (s.cantidad && s.cantidad > 0)), // opcional limpiar
        lotes: sanitizeLotes(lotes),
        imagen: form.imagen || null,
      };

      const res = await fetch(`/api/gestion/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        toast.success('Producto actualizado');
        // opcional: navegar a la lista o actualizar cache local
        router.push('/gestion/productos');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al actualizar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Cargando producto...</div>;
  if (!product) return <div className="p-4">Producto no encontrado</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/gestion/productos" className="text-amber-500 hover:text-amber-400">← Volver a productos</Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Editar producto</h1>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nombre</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} className="w-full px-3 py-2 bg-gray-700 border rounded text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Categoría</label>
              <input name="categoria" value={form.categoria} onChange={handleChange} className="w-full px-3 py-2 bg-gray-700 border rounded text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Unidad</label>
              <select name="unidad" value={form.unidad} onChange={handleChange} className="w-full px-3 py-2 bg-gray-700 border rounded text-white">
                <option value="kg">kg</option>
                <option value="caja">caja</option>
                <option value="pack">pack</option>
                <option value="unidad">unidad</option>
                <option value="litro">litro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Cantidad por unidad</label>
              <input name="cantidadUnidad" type="number" step="0.001" value={String(form.cantidadUnidad)} onChange={handleChange} className="w-full px-3 py-2 bg-gray-700 border rounded text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Precio Mayorista</label>
              <input name="precioMayorista" type="number" step="0.01" value={String(form.precioMayorista)} onChange={handleChange} className="w-full px-3 py-2 bg-gray-700 border rounded text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Precio Minorista</label>
              <input name="precioMinorista" type="number" step="0.01" value={String(form.precioMinorista)} onChange={handleChange} className="w-full px-3 py-2 bg-gray-700 border rounded text-white" />
            </div>
          </div>
          

          {/* Stock */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm text-gray-300">Stock</h3>
              <button type="button" onClick={addStock} className="text-xs bg-gray-700 px-2 py-1 rounded text-amber-400">+ Agregar depósito</button>
            </div>
            <div className="space-y-2">
              {stock.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input value={s.deposito} onChange={(e) => handleStockChange(i, 'deposito', e.target.value)} placeholder="Depósito" className="flex-1 px-3 py-2 bg-gray-700 border rounded text-white" />
                  <input type="number" value={s.cantidad || ''} onChange={(e) => handleStockChange(i, 'cantidad', Number(e.target.value))} placeholder="Cantidad" className="w-28 px-3 py-2 bg-gray-700 border rounded text-white" />
                  {stock.length > 1 && <button type="button" onClick={() => removeStock(i)} className="px-3 py-2 bg-red-700 rounded text-white">Eliminar</button>}
                </div>
              ))}
            </div>
          </div>

          {/* Lotes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm text-gray-300">Lotes</h3>
              <button type="button" onClick={addLote} className="text-xs bg-gray-700 px-2 py-1 rounded text-amber-400">+ Agregar lote</button>
            </div>
            <div className="space-y-2">
              {lotes.map((l, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input value={l.lote} onChange={(e) => handleLoteChange(i, 'lote', e.target.value)} placeholder="N° lote" className="px-3 py-2 bg-gray-700 border rounded text-white" />
                  <input type="date" value={l.vencimiento || ''} onChange={(e) => handleLoteChange(i, 'vencimiento', e.target.value)} className="px-3 py-2 bg-gray-700 border rounded text-white" />
                  <input value={l.deposito} onChange={(e) => handleLoteChange(i, 'deposito', e.target.value)} placeholder="Depósito" className="px-3 py-2 bg-gray-700 border rounded text-white" />
                  <div className="flex gap-2">
                    <input type="number" value={l.cantidad || ''} onChange={(e) => handleLoteChange(i, 'cantidad', Number(e.target.value))} placeholder="Cantidad" className="flex-1 px-3 py-2 bg-gray-700 border rounded text-white" />
                    {lotes.length > 1 && <button type="button" onClick={() => removeLote(i)} className="px-3 py-2 bg-red-700 rounded text-white">Eliminar</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>

            <Link href="/gestion/productos" className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-center">Cancelar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
