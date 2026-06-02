'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import './print.css';
import Swal from 'sweetalert2';
import { formatARS } from '@/app/lib/formatcurrenci';
import { FaPrint } from 'react-icons/fa';

interface Cliente {
    razonSocial?: string;
    nombre?: string;
    apellido?: string;
    telefono?: string;
    direccion?: string;
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

function getDireccion(cliente: any): string | null {
    if (!cliente || typeof cliente === 'string') return null;
    return cliente.direccion || null;
}

function getTelefono(cliente: any): string | null {
    if (!cliente || typeof cliente === 'string') return null;
    return cliente.telefono || null;
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

export default function ImprimirReciboPage() {
    const { id } = useParams();
    const router = useRouter();
    const auth = useAdminAuthorization();
    const [recibo, setRecibo] = useState<Recibo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (auth !== true || !id) return;

        const fetchRecibo = async () => {
            try {
                const res = await fetch(`/api/gestion/pagos/recibo?id=${id}`, {
                    cache: 'no-store',
                });

                if (!res.ok) {
                    Swal.fire('Error', 'Recibo no encontrado', 'error');
                    router.push('/gestion/cuentas-corrientes');
                    return;
                }

                const data = await res.json();
                setRecibo(data);
            } catch (err) {
                console.error('Error al cargar recibo:', err);
                Swal.fire('Error', 'No se pudo cargar el recibo', 'error');
                router.push('/gestion/cuentas-corrientes');
            } finally {
                setLoading(false);
            }
        };

        fetchRecibo();
    }, [auth, id, router]);

    const handleImprimir = () => {
        window.print();
    };

    if (auth === null || loading) {
        return (
            <div className="p-6 text-center text-gray-400 min-h-screen flex items-center justify-center">
                Cargando recibo...
            </div>
        );
    }

    if (auth === false) return null;
    if (!recibo) return null;

    return (
        // ✅ Cambiado: se eliminó min-h-screen para evitar la hoja en blanco
        <div className="bg-gray-900 p-4 flex flex-col items-center justify-start print:bg-white print:p-0">
            
            {/* SOLO PANTALLA */}
            <div className="no-print text-center mb-4">
                <p className="text-white">
                    <strong>Recibo:</strong> #{String(recibo.numero).padStart(6, '0')}
                </p>
                <Link href="/gestion/cuentas-corrientes" className="text-amber-400 underline">
                    Volver a Cuentas Corrientes
                </Link>
            </div>

            {/* TICKET */}
            <div className="ticket bg-white text-black p-3 rounded shadow max-w-[300px] print:shadow-none print:rounded-none print:max-w-none print:w-[80mm] print:p-0">
                <div className="text-center mb-1">
                    <div className="ticket-logo">
                        <img src="/El-Vaquiano.png" alt="Distribuidora El Vaquiano" className="max-w-[200px] mx-auto" />
                    </div>
                    <h2 className="font-bold text-base">RECIBO DE PAGO</h2>
                    <div className="text-xs font-semibold">#{String(recibo.numero).padStart(6, '0')}</div>
                    <div className="text-[10px] text-gray-600">
                        {new Date(recibo.fecha).toLocaleString('es-AR')}
                    </div>
                </div>

                <hr />

                <div className="border-b border-gray-200 pb-2 mb-2">
                    <div className="font-bold text-[11px]">{getClienteNombre(recibo.cliente)}</div>
                    {getDireccion(recibo.cliente) && (
                        <div className="text-[9px] text-gray-600">{getDireccion(recibo.cliente)}</div>
                    )}
                    {getTelefono(recibo.cliente) && (
                        <div className="text-[9px] text-gray-600">Tel: {getTelefono(recibo.cliente)}</div>
                    )}
                </div>

                <hr />

                <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                    <span>Detalle</span>
                    <span>Importe</span>
                </div>

                <hr />

                <div className="mt-1 space-y-1">
                    <div className="py-0.5">
                        <div className="font-bold text-[13px]">{recibo.concepto.toUpperCase()}</div>
                        <div className="text-[10px]">Forma de pago: {getFormaPagoLabel(recibo.formaPago)}</div>
                        <div className="text-right font-bold text-[11px]">{formatARS(recibo.monto)}</div>
                    </div>
                </div>

                <hr />

                <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-[11px]">
                        <span>Deuda anterior</span>
                        <span>{formatARS(recibo.deudaAnterior)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span>Pago recibido</span>
                        <span>{formatARS(recibo.monto)}</span>
                    </div>
                </div>

                <hr />

                <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL PAGADO</span>
                    <span>{formatARS(recibo.monto)}</span>
                </div>

                <hr />

                <div className="text-center text-[10px]">
                    <div className="font-bold text-green-700">PAGO REGISTRADO</div>
                    {recibo.deudaAnterior > recibo.monto ? (
                        <div>
                            Saldo restante: <strong>{formatARS(recibo.deudaAnterior - recibo.monto)}</strong>
                        </div>
                    ) : (
                        <div className="font-bold text-green-700">DEUDA SALDADA</div>
                    )}
                </div>

                <div className="text-center mt-2 text-[10px] text-gray-500">
                    Este documento es un comprobante interno de pago
                </div>
            </div>

            {/* BOTONES */}
            <div className="no-print mt-4 flex flex-col gap-2 w-full max-w-[300px]">
                <button onClick={handleImprimir} className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded flex items-center justify-center gap-2">
                    <FaPrint /> Imprimir Recibo
                </button>
                <Link href="/gestion/cuentas-corrientes" className="bg-amber-600 hover:bg-amber-700 text-white py-2 rounded text-center">
                    Volver
                </Link>
            </div>
        </div>
    );
}