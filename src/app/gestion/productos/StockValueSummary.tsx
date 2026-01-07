'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface StockTotals {
  totalLista: number;
  totalMayorista: number;
}

export default function StockValueSummary() {
  const [totales, setTotales] = useState<StockTotals>({
    totalLista: 0,
    totalMayorista: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const fetchTotales = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (fromDate) params.append('from', fromDate.toISOString());
      if (toDate) params.append('to', toDate.toISOString());

      const res = await fetch(
        `/api/gestion/productos/totales?${params.toString()}`
      );

      if (!res.ok) {
        throw new Error('Error al cargar los totales');
      }

      const data = (await res.json()) as StockTotals;
      setTotales(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar el resumen de capital');
      setError('No se pudieron cargar los valores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotales();

    const handleReload = () => fetchTotales();
    window.addEventListener('stockSummaryReload', handleReload);

    return () => {
      window.removeEventListener('stockSummaryReload', handleReload);
    };
  }, []);

  const valorVenta = totales.totalMayorista;
  const inversion = totales.totalLista;
  const gananciaPotencial = Math.max(0, valorVenta - inversion);
  const margenPorcentaje =
    inversion > 0 ? (gananciaPotencial / inversion) * 100 : 0;

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
        <h2 className="text-xl font-bold text-white mb-2">
          Capital en Mercadería
        </h2>
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
        <h2 className="text-xl font-bold text-white mb-2">
          Capital en Mercadería
        </h2>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-3">
        Capital en Mercadería
      </h2>

      {/* 📅 FILTRO FECHAS */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Desde</label>
          <DatePicker
            selected={fromDate}
            onChange={(date: any) => setFromDate(date)}
            selectsStart
            startDate={fromDate}
            endDate={toDate}
            placeholderText="Desde"
            dateFormat="dd/MM/yyyy"
            className="bg-gray-700 text-white rounded px-2 py-1 w-36"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Hasta</label>
          <DatePicker
            selected={toDate}
            onChange={(date: any) => setToDate(date)}
            selectsEnd
            startDate={fromDate}
            endDate={toDate}
            minDate={fromDate || undefined}
            placeholderText="Hasta"
            dateFormat="dd/MM/yyyy"
            className="bg-gray-700 text-white rounded px-2 py-1 w-36"
          />
        </div>

        <button
          onClick={fetchTotales}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded text-sm text-black font-medium"
        >
          Aplicar
        </button>

        <button
          onClick={() => {
            setFromDate(null);
            setToDate(null);
            fetchTotales();
          }}
          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
        >
          Limpiar
        </button>
      </div>

      {/* 💰 RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 p-3 rounded">
          <p className="text-gray-400 text-sm">
            Inversión en Stock (lista)
          </p>
          <p className="text-blue-400 text-lg font-semibold">
            ${inversion.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-gray-900 p-3 rounded">
          <p className="text-gray-400 text-sm">
            Valor de Venta Potencial
          </p>
          <p className="text-amber-400 text-lg font-semibold">
            ${valorVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 p-3 rounded mb-4">
        <p className="text-gray-400 text-sm">Ganancia Potencial</p>
        <p className="text-green-400 text-lg font-semibold">
          ${gananciaPotencial.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
          })}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Margen:{' '}
          <span className="font-medium">
            +{margenPorcentaje.toFixed(1)}%
          </span>
        </p>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Inversión</span>
          <span>Ganancia</span>
          <span>Venta</span>
        </div>

        <div className="h-4 bg-gray-700 rounded-full overflow-hidden flex">
          {valorVenta > 0 ? (
            <>
              <div
                className="h-full bg-blue-500"
                style={{ width: `${(inversion / valorVenta) * 100}%` }}
              />
              <div
                className={`h-full ${margenColor}`}
                style={{
                  width: `${(gananciaPotencial / valorVenta) * 100}%`,
                }}
              />
            </>
          ) : (
            <div className="h-full w-full bg-gray-600" />
          )}
        </div>
      </div>
    </div>
  );
}
