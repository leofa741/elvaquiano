// src/app/gestion/pedidos/[id]/imprimir/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import './print.css';
import Swal from 'sweetalert2';
import BotonImprimir from './BotonImprimir';
import { formatARS } from '@/app/lib/formatcurrenci';
import { FaArrowUp, FaArrowDown, FaPrint, FaUndo } from 'react-icons/fa';

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
    pagos?: Pago[];
    notas?: string;
    direccion?: string;
}

// Helpers
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
    
    // ✅ Estado para controlar el orden de los productos
    const [ordenInvertido, setOrdenInvertido] = useState(false);

    // Cargar pedido
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

    // ✅ Redirección automática después de imprimir (solo si viene con afterPrint)
    useEffect(() => {
        const handleAfterPrint = () => {
            const searchParams = new URLSearchParams(window.location.search);
            const redirectUrl = searchParams.get('afterPrint');
            
            if (redirectUrl) {
                setTimeout(() => {
                    router.push(redirectUrl);
                }, 300);
            }
        };
        
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, [router]);

    // ✅ Función para imprimir manualmente
    const handleImprimir = () => {
        window.print();
    };

    // ✅ Función para invertir orden de productos
    const toggleOrdenProductos = () => {
        setOrdenInvertido(prev => !prev);
    };

    // ✅ Obtener productos en el orden correcto
    const productosParaMostrar = pedido?.productos 
        ? (ordenInvertido ? [...pedido.productos].reverse() : pedido.productos)
        : [];

    if (auth === null || loading) {
        return (
            <div className="p-6 text-center text-gray-400 min-h-screen flex items-center justify-center">
                Cargando pedido...
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
                    <a 
                        href={new URLSearchParams(window.location.search).get('afterPrint') || '/gestion/pedidos'} 
                        className="text-amber-400 underline hover:text-amber-300"
                    >
                        Pedidos
                    </a>
                    .
                </span>
            </p>

            <div className="ticket bg-white text-black p-3 rounded shadow max-w-[300px]">
                
                {/* Encabezado */}
                <div className="text-center mb-1">
                    <div className="ticket-logo">
                        <img
                            src="/El-Vaquiano.png"
                            alt="Distribuidora El Vaquiano"
                            className="max-w-[200px] mx-auto"
                        />
                    </div>
                    <h2 className="font-bold text-base">PEDIDO</h2>
                    <div className="text-xs">#{pedido._id.slice(-6).toUpperCase()}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">
                        {new Date(pedido.createdAt).toLocaleString('es-AR')}
                    </div>
                </div>

                <hr />

                {/* 👤 Información del Cliente */}
                <div className="border-b border-gray-200 pb-2 mb-2">
                    <div className="font-bold text-[11px] text-gray-900 leading-tight">
                        {getClienteNombre(pedido.cliente)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        {getDireccion(pedido) && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-gray-600 font-light">
                                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="truncate max-w-[180px]">{getDireccion(pedido)}</span>
                            </span>
                        )}

                        {getTelefono(pedido) && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-gray-600 font-light">
                                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {getTelefono(pedido)}
                            </span>
                        )}

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
                
                {/* Header de productos con botón de invertir (solo en pantalla) */}
                <div className="flex justify-between items-center mt-0.5 mb-1 no-print">
                    <span className="text-[10px] text-gray-600">Cantidad / Descripción</span>
                    <button
                        onClick={toggleOrdenProductos}
                        className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition"
                        title={ordenInvertido ? 'Mostrar orden original' : 'Invertir orden de productos'}
                    >
                        {ordenInvertido ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                        {ordenInvertido ? 'Orden original' : 'Invertir orden'}
                    </button>
                    <span className='text-[10px] text-gray-600 mr-3'>Importe</span>
                </div>

                {/* Header para impresión (sin botón) */}
                <div className="hidden print:flex justify-between text-[10px] text-gray-600 mt-0.5 mb-1">
                    <span>Cantidad / Descripción</span>
                    <span className='mr-3'>Importe</span>
                </div>

                <hr />

                {/* Productos */}
                <div className="mt-1 space-y-1">
                    {productosParaMostrar.map((p, i) => (
                        <div key={`${p.nombre}-${i}`} className="py-0.5">
                            <div className="font-bold text-[13px] text-black leading-tight">
                                {p.nombre.toUpperCase()}
                            </div>
                            <div className="font-semibold text-[10px] text-black leading-tight">
                                ({p.cantidad} {p.cantidad === 1 ? 'U' : 'Uds'}) x {formatARS(p.precioAplicado)}
                            </div>
                            <div className="text-right font-bold text-[11px] leading-tight mt-0.1 mr-3">
                                {formatARS(p.cantidad * p.precioAplicado)}
                            </div>
                        </div>
                    ))}
                </div>

                <hr className="my-1" />

                {/* Total */}
                <div className="flex justify-between font-bold text-sm mr-3">
                    <span>TOTAL</span>
                    <span>{formatARS(pedido.total)}</span>
                </div>

                <hr className="my-1" />

                {/* Estado de pago */}
                <div className="text-center text-[10px] leading-tight">
                    <div className="font-bold">
                        {pedido.estadoPago === 'pagado' ? '✅ PAGADO' :
                            pedido.estadoPago === 'parcial' ? '🟡 PAGO PARCIAL' : '🔴 PAGO PENDIENTE'}
                    </div>

                    {pedido.cliente && typeof pedido.cliente !== 'string' && (
                        <div className="mt-0.5">
                            Forma de pago: {getFormaPagoLabel(pedido.cliente?.formaPago || 'efectivo')}
                        </div>
                    )}
                </div>

                <div className="text-center mt-1 text-[10px] text-gray-500 leading-tight">
                    Este documento no es comprobante fiscal
                </div>

                {/* ✅ Botones de acción (solo en pantalla - NO se imprimen) */}
                <div className="no-print mt-4 flex flex-col gap-2">
                    
                    {/* Botón Imprimir */}
                    <button
                        onClick={handleImprimir}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition"
                    >
                        <FaPrint /> Imprimir Ticket
                    </button>
                    
                    {/* Botón Invertir Orden (duplicado para mayor visibilidad) */}
                    <button
                        onClick={toggleOrdenProductos}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition"
                    >
                        <FaUndo /> {ordenInvertido ? 'Restaurar orden original' : 'Invertir orden de productos'}
                    </button>
                    
                    {/* Botón Volver */}
                    <Link
                        href={new URLSearchParams(window.location.search).get('afterPrint') || '/gestion/pedidos'}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded text-center transition"
                    >
                        ← Volver a pedidos
                    </Link>
                </div>
            </div>
        </div>
    );
}