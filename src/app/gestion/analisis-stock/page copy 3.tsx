'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { 
  FaSearch, FaUsers, FaWarehouse, FaHistory, 
  FaArrowUp, FaArrowDown, FaShoppingCart, FaUserCircle, FaShieldAlt, FaCheckCircle
} from 'react-icons/fa';

// ==========================================
// 1. INTERFACES
// ==========================================
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
  nombreCliente: string;
  telefono: string;
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

// ==========================================
// 2. COMPONENTE PRINCIPAL
// ==========================================
export default function AnalisisStockPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [producto, setProducto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAPI | null>(null);
  const [error, setError] = useState('');

  // Buscador de productos
  const [sugerenciasProducto, setSugerenciasProducto] = useState<string[]>([]);
  const [buscandoProducto, setBuscandoProducto] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // 🆕 Filtro de modo de fecha de inicio
  const [modoFiltroInicio, setModoFiltroInicio] = useState<'fecha' | 'ajuste'>('fecha');
  const [ajustesDisponibles, setAjustesDisponibles] = useState<any[]>([]);
  const [cargandoAjustes, setCargandoAjustes] = useState(false);

  // ==========================================
  // 3. SEGURIDAD
  // ==========================================
  useEffect(() => {
    const validateAccess = async () => {
      if (status === 'loading') return;
      if (status === 'unauthenticated') {
        router.push('/');
        return;
      }

      const token = session?.user?.token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      if (!token) {
        router.push('/');
        return;
      }

      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        if (!payload || !['admin', 'superadmin'].includes(payload.role)) {
          router.push('/');
          return;
        }
        setIsAuthorized(true);
      } catch (err) {
        router.push('/');
      } finally {
        setIsCheckingAuth(false);
      }
    };
    validateAccess();
  }, [status, session, router]);

  // ==========================================
  // 4. BUSCADOR DE PRODUCTOS
  // ==========================================
  useEffect(() => {
    if (producto.length < 2) {
      setSugerenciasProducto([]);
      setMostrarSugerencias(false);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscandoProducto(true);
      try {
        const res = await fetch(`/api/gestion/productos/search?q=${encodeURIComponent(producto)}`);
        if (res.ok) {
          const data = await res.json();
          setSugerenciasProducto((data.products || []).map((p: any) => p.nombre));
          setMostrarSugerencias(true);
        }
      } catch (err) {
        console.error('Error buscando productos:', err);
      } finally {
        setBuscandoProducto(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [producto]);

  // ==========================================
  // 5. 🆕 CARGAR AJUSTES CUANDO SE ELIGE ESE MODO
  // ==========================================
  useEffect(() => {
    if (modoFiltroInicio === 'ajuste' && producto.length >= 2) {
      setCargandoAjustes(true);
      setAjustesDisponibles([]);
      
      const fetchAjustes = async () => {
        try {
          // ⚠️ NOTA: Ajusta esta URL si tu endpoint de logs tiene otro nombre
          const res = await fetch(`/api/gestion/logs/stock?producto=${encodeURIComponent(producto)}&limit=10`);
          if (res.ok) {
            const data = await res.json();
            setAjustesDisponibles(data.logs || data);
          }
        } catch (err) {
          console.error('Error cargando ajustes:', err);
        } finally {
          setCargandoAjustes(false);
        }
      };
      
      fetchAjustes();
    }
  }, [modoFiltroInicio, producto]);

  // ==========================================
  // 6. SUBMIT
  // ==========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;
    
    setLoading(true);
    setError('');
    setResultado(null);
    setMostrarSugerencias(false);

    try {
      const res = await fetch('/api/analisis-stock', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.token || localStorage.getItem('token')}`
        },
        body: JSON.stringify({ producto, fechaInicio, fechaFin })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar la solicitud');
      setResultado(data);
      toast.success('Análisis completado exitosamente');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAccionLabel = (accion: string) => {
    switch (accion) {
      case "resetear_cero": return { label: "Resetear a Cero", color: "bg-red-900/30 text-red-400 border border-red-800" };
      case "cantidad_personalizada": return { label: "Ajuste Manual", color: "bg-blue-900/30 text-blue-400 border border-blue-800" };
      case "edicion_manual": return { label: "Edición Manual", color: "bg-purple-900/30 text-purple-400 border border-purple-800" };
      case "venta": return { label: "Venta / Salida", color: "bg-orange-900/30 text-orange-400 border border-orange-800" };
      case "ingreso": return { label: "Ingreso / Compra", color: "bg-green-900/30 text-green-400 border border-green-800" };
      default: return { label: accion, color: "bg-gray-900/30 text-gray-400 border border-gray-700" };
    }
  };

  if (isCheckingAuth || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaShieldAlt className="text-4xl text-amber-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Verificando credenciales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center gap-3">
          <div className="bg-amber-500/20 p-3 rounded-lg">
            <FaWarehouse className="text-2xl text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Análisis de Conciliación de Stock</h1>
            <p className="text-gray-400 text-sm mt-1">Auditoría de trazabilidad, movimientos y exactitud de inventario.</p>
          </div>
        </header>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-lg relative z-10">
          
          {/* PRODUCTO */}
          <div className="md:col-span-2 relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">Producto a Auditar</label>
            <div className="relative">
              <input 
                type="text" 
                value={producto}
                onChange={(e) => setProducto(e.target.value)}
                onFocus={() => producto.length >= 2 && setMostrarSugerencias(true)}
                placeholder="Ej: Pan Para Panchos x6" 
                required 
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-500 transition-all" 
              />
              {buscandoProducto && <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-amber-500">⏳</div>}
            </div>
            
            {mostrarSugerencias && sugerenciasProducto.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                {sugerenciasProducto.map((nombre, idx) => (
                  <button 
                    key={idx} 
                    type="button" 
                    onClick={() => { 
                      setProducto(nombre); 
                      setMostrarSugerencias(false); 
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-amber-600 hover:text-white transition-colors border-b border-gray-700 last:border-0 flex items-center gap-2"
                  >
                    <FaSearch className="text-gray-500 text-xs" /> {nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 🆕 FILTRO DE FECHA INICIO (SELECTOR DE MODO) */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">Filtro de Fecha Inicio</label>
            
            {/* Selector de modo */}
            <select 
              value={modoFiltroInicio} 
              onChange={(e) => {
                setModoFiltroInicio(e.target.value as 'fecha' | 'ajuste');
                setFechaInicio(''); // Limpiar al cambiar de modo
              }}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2 appearance-none"
            >
              <option value="fecha">📅 Ingresar fecha manualmente</option>
              <option value="ajuste">🔄 Desde último ajuste de stock</option>
            </select>

            {/* Opción A: Calendario manual */}
            {modoFiltroInicio === 'fecha' && (
              <input 
                type="date" 
                value={fechaInicio} 
                onChange={(e) => setFechaInicio(e.target.value)} 
                required 
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" 
              />
            )}

            {/* Opción B: Select con últimos ajustes */}
            {modoFiltroInicio === 'ajuste' && (
              <div className="relative">
                {cargandoAjustes ? (
                  <div className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-gray-400 flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Cargando ajustes...
                  </div>
                ) : (
                  <select
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-900 border border-amber-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none cursor-pointer"
                  >
                    <option value="">Selecciona un ajuste reciente...</option>
                    {ajustesDisponibles.map((ajuste: any, idx: number) => {
                      const fechaRaw = ajuste.timestamp || ajuste.fecha;
                      const fechaObj = new Date(fechaRaw);
                      const fechaFormateada = fechaObj.toISOString().split('T')[0];
                      return (
                        <option key={idx} value={fechaFormateada}>
                          {fechaObj.toLocaleString('es-AR')} - {ajuste.accion || 'Ajuste'} ({ajuste.usuario || 'Sistema'})
                        </option>
                      );
                    })}
                  </select>
                )}
                {!cargandoAjustes && ajustesDisponibles.length === 0 && producto && (
                  <p className="text-xs text-red-400 mt-1">No se encontraron ajustes recientes para este producto.</p>
                )}
              </div>
            )}
          </div>

          {/* FECHA FIN */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Fecha Fin</label>
            <input 
              type="date" 
              value={fechaFin} 
              onChange={(e) => setFechaFin(e.target.value)} 
              required 
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" 
            />
          </div>
          
          <div className="md:col-span-4 mt-2">
            <button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20">
              {loading ? <><span className="animate-spin">⏳</span> Analizando...</> : <><FaSearch /> Ejecutar Conciliación</>}
            </button>
          </div>
        </form>

        {error && <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-4 rounded-xl mb-6 flex items-center gap-3">❌ {error}</div>}

        {resultado && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 1. ECUACIÓN DE STOCK */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FaWarehouse className="text-amber-400" /> Ecuación de Movimiento
              </h2>
              {(() => {
                const egresosReales = resultado.stock.auditoria.totalEgresado > 0 ? resultado.stock.auditoria.totalEgresado : resultado.totalUnidadesPreparacion;
                const stockInicialCalculado = resultado.stock.actual - resultado.stock.auditoria.totalIngresado + egresosReales;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center text-center">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-blue-500/30">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Stock Inicial Est.</p>
                      <p className="text-3xl font-bold text-blue-400 font-mono">{Math.max(0, stockInicialCalculado)}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-green-900/30 text-green-400 px-3 py-1.5 rounded-full text-xs font-bold mb-1 flex items-center gap-1 border border-green-800">
                        <FaArrowUp size={10} /> +{resultado.stock.auditoria.totalIngresado}
                      </div>
                      <span className="text-xs text-gray-500 text-center">Ingresos / Ajustes (+)</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-red-900/30 text-red-400 px-3 py-1.5 rounded-full text-xs font-bold mb-1 flex items-center gap-1 border border-red-800">
                        <FaArrowDown size={10} /> -{egresosReales}
                      </div>
                      <span className="text-xs text-gray-500 text-center">Ventas y Mermas (-)</span>
                    </div>
                    <div className="flex flex-col items-center text-gray-500"><span className="text-3xl font-light">=</span></div>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-amber-500/30 ring-2 ring-amber-500/10">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Stock Actual en BD</p>
                      <p className="text-3xl font-bold text-amber-400 font-mono">{resultado.stock.actual}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 2. LÍNEA DE TIEMPO (CON BACKORDER VISIBLE) */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex items-center gap-2">
                <FaHistory className="text-amber-400" />
                <h2 className="text-lg font-bold text-white">Línea de Tiempo de Movimientos</h2>
              </div>
              
              {(() => {
                type TimelineEvent = {
                  fecha: string;
                  fechaObj: Date;
                  tipo: 'ajuste' | 'pedido';
                  detalle: string;
                  movimiento: number;
                  stockAntes: number;
                  stockDespues: number;
                  estado: string;
                };

                const eventos: TimelineEvent[] = [];
                resultado.pedidosDetalle.forEach(p => {
                  eventos.push({ fecha: p.fecha, fechaObj: new Date(p.fecha), tipo: 'pedido', detalle: p.nombreCliente, movimiento: -p.cantidad, stockAntes: 0, stockDespues: 0, estado: '' });
                });
                resultado.stock.auditoria.movimientos.forEach(m => {
                  eventos.push({ fecha: m.fecha, fechaObj: new Date(m.fecha), tipo: 'ajuste', detalle: m.usuario, movimiento: m.diferencia, stockAntes: m.anterior, stockDespues: m.nuevo, estado: '✅ Ajuste Registrado' });
                });

                eventos.sort((a, b) => a.fechaObj.getTime() - b.fechaObj.getTime());

                let currentStock = resultado.stock.inicialExacto;
                eventos.forEach(ev => {
                  if (ev.tipo === 'ajuste') {
                    ev.stockAntes = ev.stockAntes;
                    ev.stockDespues = ev.stockDespues;
                    currentStock = ev.stockDespues;
                  } else {
                    ev.stockAntes = currentStock;
                    ev.stockDespues = currentStock + ev.movimiento;
                    currentStock = ev.stockDespues;
                    ev.estado = ev.stockAntes < Math.abs(ev.movimiento) ? '⚠️ EXCESO (Backorder)' : '✅ Cubierto';
                  }
                });

                if (eventos.length === 0) return <div className="p-8 text-center text-gray-400">No hay movimientos en este periodo.</div>;

                const primerAjuste = eventos.find(ev => ev.tipo === 'ajuste');
                const pedidosPostAjuste = eventos.filter(ev => ev.tipo === 'pedido' && primerAjuste && ev.fechaObj > primerAjuste.fechaObj);
                const totalVendidoPostAjuste = Math.abs(pedidosPostAjuste.reduce((sum, ev) => sum + ev.movimiento, 0));
                const stockFinalCalculado = primerAjuste ? primerAjuste.stockDespues - totalVendidoPostAjuste : 0;

                return (
                  <div className="overflow-x-auto">
                    {primerAjuste && (
                      <div className="bg-emerald-900/20 border-b border-emerald-700/50 p-5 flex items-start gap-4">
                        <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400 text-xl mt-1">
                          <FaCheckCircle />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-emerald-400 font-bold text-sm uppercase tracking-wide mb-2">
                            Conciliación de Stock Validada
                          </h4>
                          <p className="text-gray-300 text-sm leading-relaxed mb-3">
                            El sistema garantiza trazabilidad matemática exacta a partir del primer registro de inventario:
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm font-mono bg-black/40 p-4 rounded-lg border border-emerald-800/40 w-fit shadow-inner">
                            <span className="text-white font-bold text-lg">{primerAjuste.stockDespues}</span>
                            <span className="text-gray-500 text-xs">(Stock tras ajuste)</span>
                            <span className="text-gray-500">-</span>
                            <span className="text-red-400 font-bold text-lg">{totalVendidoPostAjuste}</span>
                            <span className="text-gray-500 text-xs">(Ventas posteriores)</span>
                            <span className="text-gray-500">=</span>
                            <span className="text-emerald-400 font-bold text-xl border-l border-gray-600 pl-3">
                              {stockFinalCalculado}
                            </span>
                            <span className="text-gray-500 text-xs">(Stock final exacto)</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-900 text-gray-400 uppercase text-xs sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-4 py-3">Fecha y Hora</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Detalle</th>
                          <th className="px-4 py-3 text-center">Movimiento</th>
                          <th className="px-4 py-3 text-center">Stock Previo</th>
                          <th className="px-4 py-3 text-center">Stock Posterior</th>
                          <th className="px-4 py-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {eventos.map((ev, i) => {
                          const esPositivo = ev.movimiento > 0;
                          const movimientoStr = esPositivo ? `+${ev.movimiento}` : `${ev.movimiento}`;
                          let tipoBadge = "bg-gray-700 text-gray-300";
                          if (ev.tipo === 'ajuste') {
                            tipoBadge = "bg-blue-900/40 text-blue-400 border border-blue-700/50";
                          } else {
                            tipoBadge = "bg-amber-900/40 text-amber-400 border border-amber-700/50";
                          }

                          const estadoColor = ev.estado.includes('EXCESO') 
                            ? "text-red-400 font-bold" 
                            : ev.estado.includes('Ajuste') 
                            ? "text-green-400 font-bold" 
                            : "text-green-400 font-bold";

                          return (
                            <tr key={i} className="hover:bg-gray-700/40 transition-colors">
                              <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap font-mono">
                                {new Date(ev.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${tipoBadge}`}>
                                  {ev.tipo === 'ajuste' ? '📦 Ajuste' : '🛒 Pedido'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-white text-xs font-medium">{ev.detalle}</td>
                              <td className={`px-4 py-3 text-center font-bold font-mono ${esPositivo ? 'text-green-400' : 'text-red-400'}`}>
                                {movimientoStr}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-300 font-mono">{ev.stockAntes}</td>
                              <td className="px-4 py-3 text-center text-white font-semibold font-mono">{ev.stockDespues}</td>
                              <td className={`px-4 py-3 text-center text-xs ${estadoColor}`}>{ev.estado}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="p-4 bg-gray-900/50 border-t border-gray-700 text-xs text-gray-400 flex items-start gap-3">
                      <span className="text-amber-400 text-lg mt-0.5">💡</span>
                      <p>
                        <strong className="text-gray-300">Nota:</strong> Esta tabla muestra el cálculo exacto del stock en cada movimiento. 
                        Los valores negativos o "EXCESO (Backorder)" indican pedidos realizados antes de que existiera registro formal de inventario.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 3. DETECCIÓN DE HUECOS */}
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
                    pedidosEncontrados: pedidosEnHueco,
                    unidadesEncontradas: unidadesEnHueco
                  });
                }
              }
              if (hallazgos.length === 0) return null;

              return (
                <div className="bg-orange-900/20 border border-orange-700/50 rounded-xl p-5 shadow-lg">
                  <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">🕵️‍♂️ Hallazgos de Auditoría</h3>
                  <ul className="space-y-4">
                    {hallazgos.map((h, idx) => (
                      <li key={idx} className="text-sm text-orange-200 flex items-start gap-3 bg-orange-950/30 p-4 rounded-lg border border-orange-800/30">
                        <span className="mt-0.5 text-xl">{h.tipo === 'perdida' ? '⚠️' : 'ℹ️'}</span>
                        <div className="flex-1">
                          <p className="mb-3">
                            <strong className="text-orange-400">{h.tipo === 'perdida' ? `Desaparición de ${h.diff} unidades:` : `Aparición de ${h.diff} unidades:`}</strong>{' '}
                            Entre las {h.time1} (Stock: {h.stock1}) y las {h.time2} (Stock: {h.stock2}).
                          </p>
                          {h.tipo === 'perdida' && h.unidadesEncontradas > 0 && (
                            <div className="bg-green-900/30 border border-green-700/50 rounded-md p-4 mt-2">
                              <p className="text-green-300 font-semibold text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                                <FaShoppingCart /> Pedidos realizados en este lapso
                              </p>
                              {h.pedidosEncontrados.map((pedido: PedidoDetalle, pIdx: number) => (
                                <div key={pIdx} className="flex justify-between items-center bg-green-950/40 p-3 rounded border border-green-800/30 mb-2 last:mb-0">
                                  <div className="flex items-center gap-3">
                                    <FaUserCircle className="text-green-400 text-lg" />
                                    <div>
                                      <p className="font-semibold text-white text-sm">{pedido.nombreCliente}</p>
                                      <p className="text-green-400/70 text-xs">{pedido.telefono}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-white text-lg font-mono">{pedido.cantidad} un.</p>
                                  </div>
                                </div>
                              ))}
                              <p className="text-xs text-green-300/80 mt-3 italic border-t border-green-800/50 pt-2">
                                {h.unidadesEncontradas === h.diff ? "✅ La cantidad de los pedidos coincide perfectamente con la diferencia. ¡Misterio resuelto!" : `⚠️ Estos pedidos representan el ${Math.round((h.unidadesEncontradas / h.diff) * 100)}% de la diferencia.`}
                              </p>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* 4. RESUMEN Y DESGLOSE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FaUsers className="text-amber-400" /> Resumen</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                    <span className="text-gray-400 text-sm">Total de Órdenes</span>
                    <span className="text-2xl font-bold text-white font-mono">{resultado.totalPedidosPreparacion}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                    <span className="text-gray-400 text-sm">Clientes Únicos</span>
                    <span className="text-2xl font-bold text-blue-400 font-mono">{resultado.desglose.length}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-gray-400 text-sm">Unidades Comprometidas</span>
                    <span className="text-2xl font-bold text-green-400 font-mono">{resultado.totalUnidadesPreparacion}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-gray-700 bg-gray-900/50">
                  <h2 className="text-lg font-bold text-white">👥 Desglose por Cliente</h2>
                </div>
                <div className="overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-900 text-gray-400 uppercase text-xs sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3 text-center">N° de Pedidos</th>
                        <th className="px-4 py-3 text-center">Cantidad Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {resultado.desglose.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-700/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{c.nombreCliente}</div>
                            <div className="text-xs text-gray-500 font-mono">{c.telefono}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-gray-700 text-gray-200 px-2.5 py-1 rounded-md font-bold text-xs font-mono">{c.pedidos}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-amber-900/40 text-amber-400 px-2.5 py-1 rounded-full font-bold text-xs border border-amber-700/50 font-mono">{c.cantidadTotal}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}