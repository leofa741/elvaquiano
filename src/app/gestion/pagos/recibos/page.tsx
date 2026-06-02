'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import { formatARS } from '@/app/lib/formatcurrenci';
import { FaPrint, FaArrowLeft, FaSearch, FaFileInvoice, FaCalendar } from 'react-icons/fa';
import Swal from 'sweetalert2';

interface Cliente {
    razonSocial?: string;
    nombre?: string;
    apellido?: string;
}

interface Recibo {
    _id: string;
    numero: number;
    cliente: Cliente | string | null;
    monto: number;
    formaPago: string;
    concepto: string;
    deudaAnterior: number;
    fecha: string;
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
    const [recibos, setRecibos] = useState<Recibo[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        if (auth !== true) return;

        const fetchRecibos = async () => {
            try {
                const res = await fetch('/api/gestion/pagos/recibos', {
                    cache: 'no-store',
                });

                if (!res.ok) {
                    Swal.fire('Error', 'No se pudieron cargar los recibos', 'error');
                    return;
                }

                const data = await res.json();
                setRecibos(data);
            } catch (err) {
                console.error('Error al cargar recibos:', err);
                Swal.fire('Error', 'Error de conexión', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchRecibos();
    }, [auth]);

    const handleReimprimir = (reciboId: string) => {
        window.open(`/gestion/pagos/recibo/${reciboId}/imprimir`, '_blank');
    };

    // Filtrar recibos por búsqueda
    const recibosFiltrados = recibos.filter(recibo => {
        const termino = busqueda.toLowerCase();
        const numero = String(recibo.numero).padStart(6, '0');
        const cliente = getClienteNombre(recibo.cliente).toLowerCase();
        const concepto = recibo.concepto.toLowerCase();
        
        return numero.includes(termino) || 
               cliente.includes(termino) || 
               concepto.includes(termino);
    });

    if (auth === null || loading) {
        return (
            <div className="p-6 text-center text-gray-400 min-h-screen flex items-center justify-center">
                Cargando historial de recibos...
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
                        Historial de Recibos
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Consulta y reimprime todos los recibos de pago emitidos
                    </p>
                </div>

                <div className="text-right">
                    <div className="text-sm text-gray-400">Total de recibos</div>
                    <div className="text-2xl font-bold text-amber-400">{recibos.length}</div>
                </div>
            </div>

            {/* BÚSQUEDA */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por número, cliente o concepto..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
            </div>

            {/* LISTADO DE RECIBOS */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {recibosFiltrados.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        {busqueda ? 'No se encontraron recibos con ese criterio' : 'No hay recibos registrados'}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-700">
                        {recibosFiltrados.map((recibo) => (
                            <div key={recibo._id} className="p-4 hover:bg-gray-750 transition-colors">
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                    {/* Info del recibo */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded">
                                                #{String(recibo.numero).padStart(6, '0')}
                                            </span>
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <FaCalendar size={10} />
                                                {new Date(recibo.fecha).toLocaleDateString('es-AR')}
                                            </span>
                                        </div>
                                        
                                        <div className="font-medium text-white text-lg">
                                            {getClienteNombre(recibo.cliente)}
                                        </div>
                                        
                                        <div className="text-sm text-gray-400 mt-1">
                                            {recibo.concepto} • {getFormaPagoLabel(recibo.formaPago)}
                                        </div>

                                        {recibo.deudaAnterior > recibo.monto && (
                                            <div className="text-xs text-yellow-400 mt-1">
                                                Saldo restante: {formatARS(recibo.deudaAnterior - recibo.monto)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Monto y acción */}
                                    <div className="flex flex-col sm:items-end gap-2">
                                        <div className="text-right">
                                            <div className="text-xs text-gray-400">Monto</div>
                                            <div className="text-xl font-bold text-green-400">
                                                {formatARS(recibo.monto)}
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={() => handleReimprimir(recibo._id)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                                        >
                                            <FaPrint /> Reimprimir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}