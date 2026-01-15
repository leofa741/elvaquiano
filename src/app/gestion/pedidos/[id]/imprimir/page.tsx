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

            <div className="ticket bg-white text-black p-4 rounded shadow max-w-[300px]">
                {/* Encabezado */}
                <div className="text-center mb-2">

                    {/* LOGO */}
                    <div className="ticket-logo">
                        <img
                            src="/El-Vaquiano.png"
                            alt="Distribuidora El Vaquiano"
                        />
                    </div>
                    <h2 className="font-bold text-lg">PEDIDO</h2>
                    <div className="text-sm">#{pedido._id.slice(-6).toUpperCase()}</div>
                    <div className="text-xs text-gray-600">
                        {new Date(pedido.createdAt).toLocaleString('es-AR')}
                    </div>
                </div>

                <hr />

                {/* Cliente */}
                <div className="font-medium">{getClienteNombre(pedido.cliente)}</div>

                <hr />

                {/* Productos */}
                <div className="mt-2 space-y-1">
                    {pedido.productos.map((p, i) => (
                        <div key={i} className="text-sm">
                            {/* ✅ Línea 1: "5 unidades de leche descremada" */}
                            <div>
                                {p.cantidad} {p.cantidad === 1 ? 'unidad' : 'unidades'} de {p.nombre}
                            </div>
                            {/* ✅ Línea 2: "(5 litros)" */}
                            <div className="text-xs text-gray-600">
                                ({p.cantidad} {p.unidad})
                            </div>
                            {/* Subtotal a la derecha */}
                            <div className="text-right font-medium">
                                {formatARS(p.subtotal)}
                            </div>
                        </div>
                    ))}
                </div>

                <hr className="my-2" />

                {/* Total */}
                <div className="flex justify-between font-bold">
                    <span>TOTAL</span>
                    <span>{formatARS(pedido.total)}</span>
                </div>

                <hr className="my-2" />

                {/* Estado de pago */}
                <div className="text-center text-xs">
                    <div className="font-medium">
                        {pedido.estadoPago === 'pagado' ? '✅ PAGADO' :
                            pedido.estadoPago === 'parcial' ? '🟡 PAGO PARCIAL' : '🔴 PAGO PENDIENTE'}
                    </div>

                    {/* Mensaje adicional si es cuenta corriente */}
                    {pedido.cliente && typeof pedido.cliente !== 'string' && (
                        <div className="mt-1">
                            Forma de pago: {getFormaPagoLabel(pedido.cliente?.formaPago || 'efectivo')}
                        </div>
                    )}
                </div>

                <div className="text-center mt-3 text-xs text-gray-500">
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