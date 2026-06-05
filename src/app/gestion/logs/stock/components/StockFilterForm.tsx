'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function StockFilterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [producto, setProducto] = useState(searchParams.get('producto') || '');
  const [usuario, setUsuario] = useState(searchParams.get('usuario') || '');
  const [accion, setAccion] = useState(searchParams.get('accion') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (producto) params.set('producto', producto);
    if (usuario) params.set('usuario', usuario);
    if (accion) params.set('accion', accion);
    params.set('page', '1');
    router.push(`/gestion/logs/stock?${params.toString()}`);
  };

  const handleClear = () => {
    setProducto('');
    setUsuario('');
    setAccion('');
    router.push('/gestion/logs/stock');
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm text-gray-300 mb-1">Producto</label>
        <input
          type="text"
          value={producto}
          onChange={(e) => setProducto(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
        />
      </div>
      
      <div>
        <label className="block text-sm text-gray-300 mb-1">Usuario</label>
        <input
          type="text"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          placeholder="Buscar por email..."
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
        />
      </div>
      
      <div>
        <label className="block text-sm text-gray-300 mb-1">Tipo de Acción</label>
        <select
          value={accion}
          onChange={(e) => setAccion(e.target.value)}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
        >
          <option value="">Todas</option>
          <option value="resetear_cero">Resetear a Cero</option>
          <option value="cantidad_personalizada">Cantidad Personalizada</option>
          <option value="edicion_manual">Edición Manual</option>
        </select>
      </div>
      
      <div className="md:col-span-3 flex gap-2 justify-end">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
        >
          Limpiar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded text-white"
        >
          Filtrar
        </button>
      </div>
    </form>
  );
}