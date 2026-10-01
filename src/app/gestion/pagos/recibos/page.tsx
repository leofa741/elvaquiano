'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import { formatARS } from '@/app/lib/formatcurrenci';
import { 
    FaPrint, FaArrowLeft, FaSearch, FaFileInvoice, FaCalendar, FaMoneyBillWave,
    FaChevronLeft, FaChevronRight, FaFilePdf // 🆕 Icono para PDF
} from 'react-icons/fa';
import Swal from 'sweetalert2';

interface Cliente {
    razonSocial?: string;
    nombre?: string;
    apellido?: string;
    _id?: string;
}

interface RegistroCobro {
    _id: string;
    numero: number | null;
    cliente: Cliente | string | null;
    monto: number;
    formaPago: string;
    concepto: string;
    deudaAnterior: number;
    fecha: string;
    esReciboFormal: boolean;
    tipo: string;
}

function getClienteNombre(cliente: any): string {
    if (!cliente) return 'Cliente desconocido';
    if (typeof cliente === 'string') return 'Cliente eliminado';
    return cliente.razonSocial || `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || 'Sin nombre';
}

function getFormaPagoLabel(forma: string): string {
    const labels: Record<string, string> = {
        efectivo: 'Efectivo',
        transferencia: 'Transferencia',
        qr: 'QR',
        tarjeta: 'Tarjeta',
        cheque: 'Cheque',
        cuenta_corriente: 'Cta. Corriente',
        otro: 'Otro'
    };
    return labels[forma] || forma;
}

export default function HistorialRecibosPage() {
    const auth = useAdminAuthorization();
    const [registros, setRegistros] = useState<RegistroCobro[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 10;

    useEffect(() => {
        if (auth !== true) return;

        const fetchRegistros = async () => {
            try {
                const res = await fetch('/api/gestion/pagos/recibos', { cache: 'no-store' });
                if (!res.ok) {
                    Swal.fire('Error', 'No se pudieron cargar los registros', 'error');
                    return;
                }
                const data = await res.json();
                setRegistros(data);
            } catch (err) {
                console.error('Error al cargar registros:', err);
                Swal.fire('Error', 'Error de conexión', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchRegistros();
    }, [auth]);

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda]);

    const handleReimprimir = (registroId: string) => {
        window.open(`/gestion/pagos/recibo/${registroId}/imprimir`, '_blank');
    };

    // 🆕 FUNCIÓN PARA GENERAR Y DESCARGAR PDF
    const handleDescargarPDF = () => {
        if (registrosFiltrados.length === 0) {
            Swal.fire('Sin datos', 'No hay registros para exportar con este criterio de búsqueda.', 'warning');
            return;
        }

        const nombreFiltro = busqueda.trim() ? `Filtro aplicado: "${busqueda}"` : 'Historial Completo (Todos los Clientes)';
        const fechaHoy = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
        const totalMonto = registrosFiltrados.reduce((sum, reg) => sum + reg.monto, 0);

        const filasTabla = registrosFiltrados.map(reg => {
            const fecha = new Date(reg.fecha).toLocaleDateString('es-AR');
            const tipo = reg.esReciboFormal ? `Recibo #${String(reg.numero).padStart(6, '0')}` : 'Pago Simple';
            const formaPago = getFormaPagoLabel(reg.formaPago);
            
            return `
                <tr>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${fecha}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${tipo}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${reg.concepto}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${formaPago}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatARS(reg.monto)}</td>
                </tr>
            `;
        }).join('');

        const contenidoHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Historial de Cobros</title>
                <style>
                    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1f2937; padding: 30px; }
                    h1 { font-size: 22px; color: #111827; margin-bottom: 5px; }
                    p { font-size: 14px; color: #6b7280; margin-top: 0; margin-bottom: 25px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                    th { background-color: #f3f4f6; text-align: left; padding: 12px 8px; font-weight: 600; color: #374151; border-bottom: 2px solid #d1d5db; }
                    .total-row { font-size: 16px; font-weight: bold; background-color: #f9fafb; }
                    .total-row td { padding: 15px 8px; border-top: 2px solid #d1d5db; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Historial de Cobros</h1>
                <p>${nombreFiltro} | Fecha de emisión: ${fechaHoy}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo / Comprobante</th>
                            <th>Concepto</th>
                            <th>Forma de Pago</th>
                            <th style="text-align: right;">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasTabla}
                        <tr class="total-row">
                            <td colspan="4" style="text-align: right;">TOTAL COBRADO:</td>
                            <td style="text-align: right;">${formatARS(totalMonto)}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="no-print" style="margin-top: 40px; text-align: center; padding: 20px; background: #f3f4f6; border-radius: 8px;">
                    <p style="color: #6b7280; font-size: 13px; margin-bottom: 15px;">
                        💡 <strong>Consejo:</strong> En la ventana de impresión, selecciona <strong>"Guardar como PDF"</strong> en el destino de la impresora.
                    </p>
                    <button onclick="window.print()" style="padding: 12px 24px; background-color: #059669; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        🖨️ Imprimir / Guardar como PDF
                    </button>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(contenidoHTML);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        } else {
            Swal.fire('Error', 'El navegador bloqueó la ventana emergente. Por favor, permite las ventanas emergentes para este sitio.', 'error');
        }
    };

    const registrosFiltrados = registros.filter(registro => {
        const termino = busqueda.toLowerCase();
        const numero = registro.numero ? String(registro.numero).padStart(6, '0') : 'pago simple';
        const cliente = getClienteNombre(registro.cliente).toLowerCase();
        const concepto = registro.concepto.toLowerCase();
        const tipo = registro.tipo.toLowerCase();
        
        return numero.includes(termino) || 
               cliente.includes(termino) || 
               concepto.includes(termino) ||
               tipo.includes(termino);
    });

    const totalPaginas = Math.ceil(registrosFiltrados.length / itemsPorPagina);
    const registrosPaginados = registrosFiltrados.slice(
        (paginaActual - 1) * itemsPorPagina,
        paginaActual * itemsPorPagina
    );

    if (auth === null || loading) {
        return (
            <div className="p-6 text-center text-gray-400 min-h-screen flex items-center justify-center">
                Cargando historial de cobros...
            </div>
        );
    }

    if (auth === false) return null;

    return (
        <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-gray-900">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/gestion/cuentas-corrientes" className="text-amber-500 hover:text-amber-400 flex items-center gap-1">
                            <FaArrowLeft /> Volver
                        </Link>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <FaFileInvoice className="text-amber-400" />
                        Historial de Cobros
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Consulta todos los pagos registrados y reimprime recibos formales
                    </p>
                </div>

                <div className="text-right">
                    <div className="text-sm text-gray-400">Total de registros</div>
                    <div className="text-2xl font-bold text-amber-400">{registros.length}</div>
                </div>
            </div>

            {/* 🆕 BÚSQUEDA Y BOTÓN DE EXPORTACIÓN */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por número, cliente, concepto o tipo..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
                
                <button
                    onClick={handleDescargarPDF}
                    disabled={registrosFiltrados.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition shadow-sm w-full sm:w-auto justify-center"
                >
                    <FaFilePdf /> Descargar PDF
                </button>
            </div>

            {/* LISTADO DE REGISTROS */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {registrosFiltrados.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        {busqueda ? 'No se encontraron registros con ese criterio' : 'No hay cobros registrados'}
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-gray-700">
                            {registrosPaginados.map((registro) => (
                                <div key={registro._id} className="p-4 hover:bg-gray-750 transition-colors">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {registro.esReciboFormal ? (
                                                    <span className="text-xs font-mono bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded border border-amber-700/50 flex items-center gap-1">
                                                        <FaFileInvoice size={10} />
                                                        #{String(registro.numero).padStart(6, '0')}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-mono bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-700/50 flex items-center gap-1">
                                                        <FaMoneyBillWave size={10} />
                                                        Pago Simple
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <FaCalendar size={10} />
                                                    {new Date(registro.fecha).toLocaleDateString('es-AR')}
                                                </span>
                                            </div>
                                            
                                            <div className="font-medium text-white text-lg">
                                                {getClienteNombre(registro.cliente)}
                                            </div>
                                            
                                            <div className="text-sm text-gray-400 mt-1">
                                                {registro.concepto} • {getFormaPagoLabel(registro.formaPago)}
                                            </div>

                                            {registro.esReciboFormal && registro.deudaAnterior > registro.monto && (
                                                <div className="text-xs text-yellow-400 mt-1">
                                                    Saldo restante tras este pago: {formatARS(registro.deudaAnterior - registro.monto)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:items-end gap-2">
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400">Monto</div>
                                                <div className="text-xl font-bold text-green-400">
                                                    {formatARS(registro.monto)}
                                                </div>
                                            </div>
                                            
                                            {registro.esReciboFormal ? (
                                                <button
                                                    onClick={() => handleReimprimir(registro._id)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                                                >
                                                    <FaPrint /> Reimprimir
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-500 italic px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                                                    Sin comprobante de impresión
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* CONTROLES DE PAGINACIÓN */}
                        {totalPaginas > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-gray-900/50 border-t border-gray-700">
                                <div className="text-sm text-gray-400 mb-3 sm:mb-0">
                                    Mostrando <span className="font-medium text-white">{(paginaActual - 1) * itemsPorPagina + 1}</span> a{' '}
                                    <span className="font-medium text-white">{Math.min(paginaActual * itemsPorPagina, registrosFiltrados.length)}</span> de{' '}
                                    <span className="font-medium text-white">{registrosFiltrados.length}</span> resultados
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                                        disabled={paginaActual === 1}
                                        className="px-4 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-600 transition flex items-center gap-2 text-sm font-medium"
                                    >
                                        <FaChevronLeft size={12} /> Anterior
                                    </button>
                                    
                                    <button
                                        onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                                        disabled={paginaActual === totalPaginas}
                                        className="px-4 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-600 transition flex items-center gap-2 text-sm font-medium"
                                    >
                                        Siguiente <FaChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}