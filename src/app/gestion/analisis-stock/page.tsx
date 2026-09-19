'use client';

import { useState } from 'react';
import { FaSearch, FaUsers, FaWarehouse, FaHistory, FaArrowUp, FaArrowDown, FaShoppingCart, FaUserCircle } from 'react-icons/fa';

// Interfaces
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

interface PedidoDetalle {
  fecha: string;
  cantidad: number;
  clienteId: string;
  nombreCliente: string; // <--- NUEVO
  telefono: string;      // <--- NUEVO
}

interface ResultadoAPI {
  producto: string;
  fechaInicio: string;
  fechaFin: string;
  totalPedidosPreparacion: number;
  totalUnidadesPreparacion: number;
  desglose: DesgloseCliente[];
  pedidosDetalle: PedidoDetalle[]; 
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
              {loading ? <><span className="animate-spin">⏳</span> Analizando base de datos...</> : <><FaSearch /> Ejecutar Análisis</>}
            </button>
          </div>
        </form>

        {error && <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">❌ {error}</div>}

        {resultado && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 1. ECUACIÓN DE STOCK INTELIGENTE */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FaWarehouse className="text-amber-400" /> Ecuación de Movimiento de Stock
              </h2>
              
              {(() => {
                const egresosReales = resultado.stock.auditoria.totalEgresado > 0 
                  ? resultado.stock.auditoria.totalEgresado 
                  : resultado.totalUnidadesPreparacion;
                
                const stockInicialCalculado = resultado.stock.actual - resultado.stock.auditoria.totalIngresado + egresosReales;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center text-center">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-blue-500/30">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Stock Inicial Est. ({resultado.fechaInicio})</p>
                      <p className="text-3xl font-bold text-blue-400">{Math.max(0, stockInicialCalculado)}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-xs font-bold mb-1 flex items-center gap-1">
                        <FaArrowUp size={10} /> +{resultado.stock.auditoria.totalIngresado}
                      </div>
                      <span className="text-xs text-gray-500 text-center">Ingresos /<br/>Ajustes (+)</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-red-900/30 text-red-400 px-3 py-1 rounded-full text-xs font-bold mb-1 flex items-center gap-1">
                        <FaArrowDown size={10} /> -{egresosReales}
                      </div>
                      <span className="text-xs text-gray-500 text-center">Ventas Prep.<br/>y Mermas (-)</span>
                    </div>
                    <div className="flex flex-col items-center text-gray-500">
                      <span className="text-2xl">=</span>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-amber-500/30">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Stock Actual en BD ({resultado.fechaFin})</p>
                      <p className="text-3xl font-bold text-amber-400">{resultado.stock.actual}</p>
                    </div>
                  </div>
                );
              })()}
              
              {resultado.stock.detalleDepositos.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <p className="text-sm font-medium text-gray-300 mb-2">Distribución actual del stock en BD:</p>
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

            {/* 🕵️‍♂️ DETECCIÓN AUTOMÁTICA DE HUECOS + CRUCE CON PEDIDOS Y CLIENTES */}
            {(() => {
              const hallazgos: any[] = [];
              const movs = [...resultado.stock.auditoria.movimientos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
              
              for (let i = 1; i < movs.length; i++) {
                const prev = movs[i - 1];
                const curr = movs[i];
                if (prev.nuevo !== curr.anterior) {
                  const diff = prev.nuevo - curr.anterior;
                  const time1 = new Date(prev.fecha);
                  const time2 = new Date(curr.fecha);
                  
                  // 🔍 CRUCE: Buscar pedidos en este lapso exacto
                  const pedidosEnHueco = resultado.pedidosDetalle.filter((p: PedidoDetalle) => {
                    const pDate = new Date(p.fecha);
                    return pDate >= time1 && pDate <= time2;
                  });
                  
                  const unidadesEnHueco = pedidosEnHueco.reduce((sum: number, p: PedidoDetalle) => sum + p.cantidad, 0);

                  hallazgos.push({
                    tipo: diff > 0 ? 'perdida' : 'ganancia',
                    diff: Math.abs(diff),
                    time1: time1.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
                    time2: time2.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
                    stock1: prev.nuevo,
                    stock2: curr.anterior,
                    pedidosEncontrados: pedidosEnHueco, // Guardamos el array completo para mostrarlo
                    unidadesEncontradas: unidadesEnHueco
                  });
                }
              }
              
              if (hallazgos.length === 0) return null;

              return (
                <div className="bg-orange-900/20 border border-orange-700/50 rounded-xl p-5">
                  <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
                    🕵️‍♂️ Hallazgos de Auditoría: Movimientos no registrados detectados
                  </h3>
                  <ul className="space-y-4">
                    {hallazgos.map((h, idx) => (
                      <li key={idx} className="text-sm text-orange-200 flex items-start gap-3 bg-orange-950/30 p-4 rounded-lg border border-orange-800/30">
                        <span className="mt-0.5 text-xl">{h.tipo === 'perdida' ? '⚠️' : 'ℹ️'}</span>
                        <div className="flex-1">
                          <p className="mb-3">
                            <strong className="text-orange-400">
                              {h.tipo === 'perdida' ? `Desaparición de ${h.diff} unidades:` : `Aparición de ${h.diff} unidades:`}
                            </strong>{' '}
                            Entre las {h.time1} (Stock: {h.stock1}) y las {h.time2} (Stock registrado: {h.stock2}). No hay registro en bitácora.
                          </p>
                          
                          {/* 💡 AQUÍ ESTÁ LA MAGIA: Mostrar los clientes específicos */}
                          {h.tipo === 'perdida' && h.unidadesEncontradas > 0 && (
                            <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 mt-2">
                              <p className="text-green-300 font-semibold text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                                <FaShoppingCart /> Coincidencia Detectada: Pedidos realizados en este lapso
                              </p>
                              <div className="space-y-2">
                                {h.pedidosEncontrados.map((pedido: PedidoDetalle, pIdx: number) => (
                                  <div key={pIdx} className="flex justify-between items-center bg-green-950/40 p-3 rounded border border-green-800/30">
                                    <div className="flex items-center gap-3">
                                      <FaUserCircle className="text-green-400 text-lg" />
                                      <div>
                                        <p className="font-semibold text-white text-sm">{pedido.nombreCliente}</p>
                                        <p className="text-green-400/70 text-xs">{pedido.telefono}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-white text-lg">{pedido.cantidad} un.</p>
                                      <p className="text-green-400/70 text-xs">
                                        {new Date(pedido.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-green-300/80 mt-3 italic border-t border-green-800/50 pt-2">
                                {h.unidadesEncontradas === h.diff 
                                  ? "✅ La cantidad de los pedidos coincide perfectamente con la diferencia de stock. ¡Misterio resuelto!" 
                                  : `⚠️ Estos pedidos representan el ${Math.round((h.unidadesEncontradas / h.diff) * 100)}% de la diferencia. El resto podría ser merma o ajuste no registrado.`}
                              </p>
                            </div>
                          )}

                          {h.tipo === 'perdida' && h.unidadesEncontradas === 0 && (
                            <p className="text-xs text-orange-300/70 mt-2 italic bg-orange-950/20 p-2 rounded">
                              * No se encontraron pedidos en preparación en este lapso. Podría ser una venta por mostrador, merma, o un error de tipeo al cargar el siguiente ajuste.
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-orange-300/70 mt-4 italic border-t border-orange-800/50 pt-3">
                    * El sistema compensa matemáticamente estas diferencias para mantener la ecuación de stock cuadrada.
                  </p>
                </div>
              );
            })()}

            {/* 2. PEDIDOS EN PREPARACIÓN (Resumen y Tabla) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FaUsers className="text-amber-400" /> Resumen de Preparación
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                    <span className="text-gray-400 text-sm">Total de Órdenes (Pedidos)</span>
                    <span className="text-2xl font-bold text-white">{resultado.totalPedidosPreparacion}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                    <span className="text-gray-400 text-sm">Clientes Únicos involucrados</span>
                    <span className="text-2xl font-bold text-blue-400">{resultado.desglose.length}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-gray-400 text-sm">Unidades totales comprometidas</span>
                    <span className="text-2xl font-bold text-green-400">{resultado.totalUnidadesPreparacion}</span>
                  </div>
                </div>
                
                {resultado.totalPedidosPreparacion !== resultado.desglose.length && (
                  <div className="mt-4 bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
                    <p className="text-xs text-blue-300">
                      💡 <strong>Nota:</strong> Hay más pedidos que filas en la tabla porque algunos clientes realizaron más de una compra en este periodo.
                    </p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-700 bg-gray-900/50">
                  <h2 className="text-lg font-bold text-white">👥 Desglose por Cliente (Agrupado)</h2>
                </div>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-900 text-gray-400 uppercase text-xs sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3 text-center">N° de Pedidos</th>
                        <th className="px-4 py-3 text-center">Cantidad Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {resultado.desglose.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{c.nombreCliente}</div>
                            <div className="text-xs text-gray-500">{c.telefono}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-gray-700 text-gray-200 px-2 py-1 rounded-md font-bold text-xs">
                              {c.pedidos}
                            </span>
                          </td>
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
}