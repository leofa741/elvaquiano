'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import './print.css';

import Swal from 'sweetalert2';
import BotonImprimir from './BotonImprimir';
import { formatARS } from '@/app/lib/formatcurrenci';

// Tipos
interface Cliente {
    razonSocial?: string;
    nombre?: string;
    apellido?: string;
    telefono?: string;
    formaPago?: string;
    direccion?: string;
}

interface Producto {
    nombre: string;
    unidad: string;
    cantidad: number;
    precioAplicado: number;
    subtotal: number;
}

interface Pago {
    _id: string;
    monto: number;
    formaPago: string;
    fechaPago: string;
}

interface Pedido {
    _id: string;
    cliente: Cliente | string | null;
    productos: Producto[];
    total: number;
    estado: string;
    estadoPago: 'pendiente' | 'parcial' | 'pagado';
    createdAt: string;
    pagos?: Pago[]; // opcional: si decides cargarlos
    notas?: string;
    direccion?: string;
}

function getClienteNombre(cliente: any): string {
    if (!cliente) return 'Cliente desconocido';
    if (typeof cliente === 'string') return 'Cliente eliminado';
    return cliente.razonSocial || `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || 'Sin nombre';
}

function getDireccion(pedido: Pedido): string | null {
    return pedido.direccion ||
        (typeof pedido.cliente === 'object' && pedido.cliente?.direccion) ||
        null;
}

function getTelefono(pedido: Pedido): string | null {
    return pedido.cliente && typeof pedido.cliente === 'object' ? pedido.cliente.telefono || null : null;
}



function getFormaPagoLabel(forma: string): string {
    const labels: Record<string, string> = {
        efectivo: 'Efectivo',
        transferencia: 'Transferencia',
        qr: 'QR',
        tarjeta: 'Tarjeta',
        cuenta_corriente: 'Cta. Corriente',
        otro: 'Otro'
    };
    return labels[forma] || forma;
}

export default function ImprimirPedidoPage() {
    const { id } = useParams();
    const router = useRouter();
    const auth = useAdminAuthorization();
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (auth !== true || !id) return;

        const fetchPedido = async () => {
            try {
                const res = await fetch(`/api/gestion/pedidos/${id}`, {
                    cache: 'no-store',
                });

                if (!res.ok) {
                    Swal.fire('Error', 'Pedido no encontrado', 'error');
                    router.push('/gestion/pedidos');
                    return;
                }

                const data = await res.json();
                setPedido(data);
            } catch (err) {
                console.error('Error al cargar pedido:', err);
                Swal.fire('Error', 'No se pudo cargar el pedido', 'error');
                router.push('/gestion/pedidos');
            } finally {
                setLoading(false);
            }
        };

        fetchPedido();
    }, [auth, id, router]);

    if (auth === null || loading) {
        return (
            <div className="p-6 text-center text-gray-400 min-h-screen flex items-center justify-center">
                Cargando...
            </div>
        );
    }

    if (auth === false) return null;
    if (!pedido) return null;

    return (
        <div className="min-h-screen bg-gray-900 p-4 flex flex-col items-center justify-start">
            <p className="text-white text-center mb-4 max-w-2xl">
                <strong>Pedido:</strong> #{pedido._id.slice(-6).toUpperCase()}
                <br />
                <span className="text-gray-400 mt-1">
                    volver a la sección de{' '}
                    <a href="/gestion/pedidos" className="text-amber-400 underline">
                        Pedidos
                    </a>
                    .
                </span>
            </p>

            <div className="ticket bg-white text-black p-3 rounded shadow max-w-[300px]"> {/* ✅ Padding reducido */}
                {/* Encabezado */}
                <div className="text-center mb-1"> {/* ✅ Margen reducido */

                }

                    {/* LOGO */}
                    <div className="ticket-logo">
                        <img
                            src="/El-Vaquiano.png"
                            alt="Distribuidora El Vaquiano"
                        />
                    </div>
                    <h2 className="font-bold text-base">PEDIDO</h2> {/* ✅ Tamaño reducido */}
                    <div className="text-xs">#{pedido._id.slice(-6).toUpperCase()}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5"> {/* ✅ Más compacto */}
                        {new Date(pedido.createdAt).toLocaleString('es-AR')}
                    </div>

                </div>

                <hr />

                {/* 👤 Información del Cliente - Diseño optimizado para ticket */}
                <div className="border-b border-gray-200 pb-2 mb-2">
                    {/* Nombre del cliente - Destacado */}
                    <div className="font-bold text-[11px] text-gray-900 leading-tight">
                        {getClienteNombre(pedido.cliente)}
                    </div>

                    {/* Datos de contacto - Grid flexible */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        {/* Dirección */}
                        {getDireccion(pedido) && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-gray-600 font-light">
                                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="truncate max-w-[180px]">{getDireccion(pedido)}</span>
                            </span>
                        )}

                        {/* Teléfono */}
                        {getTelefono(pedido) && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-gray-600 font-light">
                                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {getTelefono(pedido)}
                            </span>
                        )}

                        {/* Fallback: Consumidor Final - Solo si no hay NINGÚN dato de contacto */}
                        {!getDireccion(pedido) && !getTelefono(pedido) && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-gray-400 italic font-light">
                                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Consumidor final
                            </span>
                        )}
                    </div>
                </div>
                <hr className="border-t border-gray-500" />
                <div className="text-[10px] text-gray-600 flex justify-between mt-0.5">
                    <span>Cantidad / Descripcion</span>
                    <span className='mr-3'>importe</span>
                </div>

                <hr />

                {/* Productos */}
                <div className="mt-1 space-y-1"> {/* ✅ Margen y gap reducidos */}
                    {pedido.productos.map((p, i) => (
                        <div key={i} className="py-0.5"> {/* ✅ Padding vertical mínimo */}
                            {/* ✅ Línea 1: "5 unidades de leche descremada" */}
                            <div className="font-bold text-[13px] text-black leading-tight">
                                {p.nombre.toUpperCase()}
                            </div>



                            <div className="font-semibold text-[10px] text-black leading-tight">
                                ({p.cantidad} {p.cantidad === 1 ? 'U' : 'Uds'}) x {formatARS(p.precioAplicado)}
                            </div>

                            {/* Subtotal a la derecha */}
                            <div className="text-right font-bold text-[11px] leading-tight mt-0.1 mr-3">
                                {formatARS(p.cantidad * p.precioAplicado)}
                            </div>
                        </div>
                    ))}
                </div>

                <hr className="my-1" /> {/* ✅ Margen reducido */

                }

                {/* Total */}
                <div className="flex justify-between font-bold text-sm mr-3"> {/* ✅ Más compacto */}
                    <span>TOTAL</span>
                    <span>{formatARS(pedido.total)}</span>
                </div>

                <hr className="my-1" /> {/* ✅ Margen reducido */

                }

                {/* Estado de pago */}
                <div className="text-center text-[10px] leading-tight"> {/* ✅ Más compacto */}
                    <div className="font-bold">
                        {pedido.estadoPago === 'pagado' ? '✅ PAGADO' :
                            pedido.estadoPago === 'parcial' ? '🟡 PAGO PARCIAL' : '🔴 PAGO PENDIENTE'}
                    </div>

                    {/* Mensaje adicional si es cuenta corriente */}
                    {pedido.cliente && typeof pedido.cliente !== 'string' && (
                        <div className="mt-0.5">
                            Forma de pago: {getFormaPagoLabel(pedido.cliente?.formaPago || 'efectivo')}
                        </div>
                    )}
                </div>

                <div className="text-center mt-1 text-[10px] text-gray-500 leading-tight"> {/* ✅ Más compacto */}
                    Este documento no es comprobante fiscal
                </div>

                {/* Botones (solo en pantalla) */}
                <div className="no-print mt-4">
                    <BotonImprimir />
                </div>
            </div>
        </div>
    );
}