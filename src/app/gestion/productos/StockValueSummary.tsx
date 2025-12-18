'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface StockTotals {
  totalLista: number;
  totalMayorista: number;
}

export default function StockValueSummary() {
  const [totales, setTotales] = useState<StockTotals>({ totalLista: 0, totalMayorista: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTotales = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gestion/productos/totales');
      if (!res.ok) {
        throw new Error('Error al cargar los totales');
      }
      const data = await res.json() as StockTotals;
      setTotales(data);
    } catch (err) {
      console.error('Error al cargar totales de stock:', err);
      setError('No se pudieron cargar los valores del stock.');
      toast.error('Error al cargar el resumen de capital en mercadería');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotales(); // Carga inicial

    // 🔁 Escuchar evento global de eliminación
    const handleReload = () => {
      fetchTotales();
    };

    window.addEventListener('stockSummaryReload', handleReload);

    return () => {
      window.removeEventListener('stockSummaryReload', handleReload);
    };
  }, []);

  const valorVenta = totales.totalMayorista;
  const inversion = totales.totalLista;
  const gananciaPotencial = Math.max(0, valorVenta - inversion);
  const margenPorcentaje = inversion > 0 ? (gananciaPotencial / inversion) * 100 : 0;

  const getMargenColor = () => {
    if (margenPorcentaje < 10) return 'bg-red-500';
    if (margenPorcentaje < 25) return 'bg-orange-500';
    if (margenPorcentaje < 50) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const margenColor = getMargenColor();

  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 animate-pulse">
        <h2 className="text-xl font-bold text-white mb-2">Capital en Mercadería</h2>
        <div className="space-y-4">
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-3 bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg border border-red-700">
        <h2 className="text-xl font-bold text-white mb-2">Capital en Mercadería</h2>
        <p className="text-red-400">No se pudieron cargar los valores del stock.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-3">Capital en Mercadería</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 p-3 rounded">
          <p className="text-gray-400 text-sm">Inversión en Stock (con valores en lista)</p>
          <p className="text-blue-400 text-lg font-semibold">
            ${inversion.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-gray-900 p-3 rounded">
          <p className="text-gray-400 text-sm">Valor de Venta Potencial (con valores mayoristas)</p>
          <p className="text-amber-400 text-lg font-semibold">
            ${valorVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 p-3 rounded mb-4">
        <p className="text-gray-400 text-sm">Ganancia Potencial</p>
        <p className="text-green-400 text-lg font-semibold">
          ${gananciaPotencial.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Margen: <span className="font-medium">+{margenPorcentaje.toFixed(1)}%</span> sobre inversión
        </p>
      </div>

      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Inversión</span>
          <span>Ganancia</span>
          <span>Valor de Venta</span>
        </div>
        <div className="h-4 bg-gray-700 rounded-full overflow-hidden flex">
          {valorVenta > 0 ? (
            <>
              <div
                className="h-full bg-blue-500 flex items-center justify-end pr-1"
                style={{ width: `${(inversion / valorVenta) * 100}%` }}
              >
                <span className="text-[10px] text-white font-bold">●</span>
              </div>
              <div
                className={`h-full ${margenColor}`}
                style={{ width: `${(gananciaPotencial / valorVenta) * 100}%` }}
              />
            </>
          ) : (
            <div className="h-full w-full bg-gray-600" />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>${inversion.toLocaleString('es-AR')}</span>
          <span>${gananciaPotencial.toLocaleString('es-AR')}</span>
          <span>${valorVenta.toLocaleString('es-AR')}</span>
        </div>
      </div>
    </div>
  );
}