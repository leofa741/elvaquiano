'use client';

import { useState } from 'react';
import { FaSearch, FaUsers, FaWarehouse, FaHistory, FaArrowUp, FaArrowDown } from 'react-icons/fa';

// Interfaces actualizadas
interface MovimientoStock {
  fecha: string;
  usuario: string;
  accion: string;
  anterior: number;
  nuevo: number;
  diferencia: number;
}

interface DesgloseCliente {
  idCliente: string;
  nombreCliente: string;
  telefono: string;
  cantidadTotal: number;
  pedidos: number;
}

interface ResultadoAPI {
  producto: string;
  fechaInicio: string;
  fechaFin: string;
  totalPedidosPreparacion: number;
  totalUnidadesPreparacion: number;
  desglose: DesgloseCliente[];
  stock: {
    actual: number;
    inicialExacto: number;
    detalleDepositos: { deposito: string; cantidad: number }[];
    auditoria: {
      totalIngresado: number;
      totalEgresado: number;
      movimientos: MovimientoStock[];
    };
  };
}

export default function AnalisisStockPage() {
  const [producto, setProducto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAPI | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResultado(null);

    try {
      const res = await fetch('/api/analisis-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto, fechaInicio, fechaFin })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error desconocido');
      setResultado(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAccionLabel = (accion: string) => {
    switch (accion) {
      case "resetear_cero": return { label: "Resetear a Cero", color: "bg-red-900/30 text-red-400" };
      case "cantidad_personalizada": return { label: "Ajuste Manual", color: "bg-blue-900/30 text-blue-400" };
      case "edicion_manual": return { label: "Edición Manual", color: "bg-purple-900/30 text-purple-400" };
      case "venta": return { label: "Venta / Salida", color: "bg-orange-900/30 text-orange-400" };
      case "ingreso": return { label: "Ingreso / Compra", color: "bg-green-900/30 text-green-400" };
      default: return { label: accion, color: "bg-gray-900/30 text-gray-400" };
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">📊 Análisis Profundo de Stock y Pedidos</h1>
          <p className="text-gray-400">Auditoría completa: stock inicial, movimientos, egresos y pedidos en preparación.</p>
        </header>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-lg">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">Producto</label>
            <input type="text" value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Ej: Yogur Cremigal Frutilla x1LT" required className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Fecha Inicio</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Fecha Fin</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="md:col-span-4 mt-2">
            <button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><span className="animate-spin">⏳</span> Analizando base de datos...</> : <><FaSearch /> Ejecuar Análisis</>}
            </button>
          </div>
        </form>

        {error && <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">❌ {error}</div>}

        {resultado && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 1. ECUACIÓN DE STOCK (LA JOYA DE LA CORONA) */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FaWarehouse className="text-amber-400" /> Ecuación de Movimiento de Stock
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center text-center">
                <div className="bg-gray-900/50 p-4 rounded-lg border border-blue-500/30">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Stock Inicial ({resultado.fechaInicio})</p>
                  <p className="text-3xl font-bold text-blue-400">{resultado.stock.inicialExacto}</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-xs font-bold mb-1 flex items-center gap-1">
                    <FaArrowUp size={10} /> +{resultado.stock.auditoria.totalIngresado}
                  </div>
                  <span className="text-xs text-gray-500">Ingresos / Ajustes (+)</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="bg-red-900/30 text-red-400 px-3 py-1 rounded-full text-xs font-bold mb-1 flex items-center gap-1">
                    <FaArrowDown size={10} /> -{resultado.stock.auditoria.totalEgresado}
                  </div>
                  <span className="text-xs text-gray-500">Egresos / Mermas (-)</span>
                </div>

                <div className="bg-gray-900/50 p-4 rounded-lg border border-amber-500/30">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Stock Actual ({resultado.fechaFin})</p>
                  <p className="text-3xl font-bold text-amber-400">{resultado.stock.actual}</p>
                </div>
              </div>
              
              {/* Detalle de depósitos actual */}
              {resultado.stock.detalleDepositos.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <p className="text-sm font-medium text-gray-300 mb-2">Distribución actual del stock:</p>
                  <div className="flex flex-wrap gap-3">
                    {resultado.stock.detalleDepositos.map((d, i) => (
                      <span key={i} className="bg-gray-900 px-3 py-1 rounded-md text-sm text-gray-300 border border-gray-700">
                        📍 {d.deposito}: <strong className="text-white">{d.cantidad}</strong> un.
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. PEDIDOS EN PREPARACIÓN */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FaUsers className="text-amber-400" /> Resumen de Preparación
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                    <span className="text-gray-400">Pedidos en estado "preparación"</span>
                    <span className="text-xl font-bold text-white">{resultado.totalPedidosPreparacion}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Unidades comprometidas</span>
                    <span className="text-2xl font-bold text-green-400">{resultado.totalUnidadesPreparacion}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-700 bg-gray-900/50">
                  <h2 className="text-lg font-bold text-white">👥 Desglose por Cliente</h2>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-900 text-gray-400 uppercase text-xs sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3 text-center">Pedidos</th>
                        <th className="px-4 py-3 text-center">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {resultado.desglose.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{c.nombreCliente}</div>
                            <div className="text-xs text-gray-500">{c.telefono}</div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-400">{c.pedidos}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-amber-900/40 text-amber-400 px-2 py-1 rounded-full font-bold text-xs border border-amber-700/50">
                              {c.cantidadTotal}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 3. TABLA DE AUDITORÍA DE MOVIMIENTOS */}
            {resultado.stock.auditoria.movimientos.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex items-center gap-2">
                  <FaHistory className="text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Bitácora de Movimientos en el Periodo</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Fecha y Hora</th>
                        <th className="px-4 py-3">Usuario</th>
                        <th className="px-4 py-3">Acción</th>
                        <th className="px-4 py-3 text-center">Anterior</th>
                        <th className="px-4 py-3 text-center">Nuevo</th>
                        <th className="px-4 py-3 text-center">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {resultado.stock.auditoria.movimientos.map((m, i) => {
                        const accionInfo = getAccionLabel(m.accion);
                        const esPositivo = m.diferencia > 0;
                        return (
                          <tr key={i} className="hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 text-gray-300 text-xs">
                              {new Date(m.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-4 py-3 text-white text-xs">{m.usuario}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${accionInfo.color}`}>
                                {accionInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-400">{m.anterior}</td>
                            <td className="px-4 py-3 text-center text-white font-semibold">{m.nuevo}</td>
                            <td className={`px-4 py-3 text-center font-bold ${esPositivo ? 'text-green-400' : 'text-red-400'}`}>
                              {esPositivo ? '+' : ''}{m.diferencia}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );