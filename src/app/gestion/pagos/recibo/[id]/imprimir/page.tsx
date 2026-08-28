'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import './print.css';
import Swal from 'sweetalert2';
import { formatARS } from '@/app/lib/formatcurrenci';
import { FaPrint, FaFilePdf } from 'react-icons/fa';

// ✅ CAMBIO: Usamos html-to-image en lugar de html2canvas
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

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
    
    const ticketRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (auth !== true || !id) return;

        const fetchRecibo = async () => {
            try {
                const res = await fetch(`/api/gestion/pagos/recibo?id=${id}`, { cache: 'no-store' });
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

    // ✅ FUNCIÓN MEJORADA: Usa html-to-image (soporta colores modernos de Tailwind v4)
    const handleEnviarWhatsApp = async () => {
        if (!recibo || !ticketRef.current) {
            Swal.fire('Error', 'No se pudo encontrar el ticket en pantalla', 'error');
            return;
        }

        Swal.fire({
            title: 'Generando comprobante...',
            html: 'Creando el PDF, por favor espera un momento.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            // 1. Capturar el div del ticket como imagen PNG
            const imgData = await toPng(ticketRef.current, { 
                cacheBust: true,
                backgroundColor: '#ffffff', // Forzar fondo blanco
                pixelRatio: 2, // Alta calidad
                // Ignorar elementos que puedan causar problemas
                filter: (node) => {
                    // Excluir scripts, estilos problemáticos, etc.
                    if (node instanceof HTMLElement) {
                        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return false;
                    }
                    return true;
                }
            });

            // 2. Crear PDF con dimensiones del ticket
            const img = new Image();
            img.src = imgData;
            
            // Esperar a que la imagen cargue para obtener sus dimensiones
            await new Promise((resolve) => {
                img.onload = resolve;
            });

            const imgWidthMm = 80; // Ancho estándar ticket térmico
            const imgHeightMm = (img.height * imgWidthMm) / img.width;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [imgWidthMm, imgHeightMm]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMm, imgHeightMm);
            
            const numeroRecibo = String(recibo.numero).padStart(6, '0');
            pdf.save(`Recibo_${numeroRecibo}.pdf`);

            // 3. Lógica de WhatsApp
            const telefono = getTelefono(recibo.cliente);
            let telefonoLimpio = telefono ? telefono.replace(/\D/g, '') : '';
            
            if (telefonoLimpio.length === 10 && !telefonoLimpio.startsWith('54')) {
                telefonoLimpio = `549${telefonoLimpio}`;
            } else if (telefonoLimpio.length === 11 && telefonoLimpio.startsWith('0')) {
                telefonoLimpio = `549${telefonoLimpio.substring(1)}`;
            }

            const clienteNombre = getClienteNombre(recibo.cliente);
            const mensaje = `Hola ${clienteNombre} , te envío el comprobante de tu pago por *${formatARS(recibo.monto)}*. ¡Muchas gracias por tu confianza! `;
            
            const url = telefonoLimpio 
                ? `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`
                : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

            Swal.close();

            // 4. Abrir WhatsApp e instruir
            setTimeout(() => {
                window.open(url, '_blank');
                Swal.fire({
                    icon: 'success',
                    title: '¡PDF Listo!',
                    html: `
                        <div class="text-left text-sm">
                            <p class="mb-2">Se descargó <strong>Recibo_${numeroRecibo}.pdf</strong> en tu dispositivo.</p>
                            <p class="text-gray-300">
                                1. Se acaba de abrir WhatsApp.<br>
                                2. Haz clic en el ícono de <strong>Clip 📎 (Adjuntar)</strong>.<br>
                                3. Selecciona el PDF que se acaba de descargar.
                            </p>
                        </div>
                    `,
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#25D366',
                    background: '#1f2937',
                    color: '#f3f4f6'
                });
            }, 800);

        } catch (error: any) {
            console.error('❌ ERROR DETALLADO AL GENERAR PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al generar PDF',
                html: `<p>No se pudo generar el archivo.</p><p class="text-xs text-gray-400 mt-2 bg-gray-800 p-2 rounded">${error.message || 'Revisa la consola (F12)'}</p>`,
                confirmButtonColor: '#d33'
            });
        }
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
        <div className="bg-gray-900 p-4 flex flex-col items-center justify-start print:bg-white print:p-0">
            <div className="no-print text-center mb-4">
                <p className="text-white"><strong>Recibo:</strong> #{String(recibo.numero).padStart(6, '0')}</p>
                <Link href="/gestion/cuentas-corrientes" className="text-amber-400 underline hover:text-amber-300 transition">
                    Volver a Cuentas Corrientes
                </Link>
            </div>

            {/* ✅ TICKET CON REF */}
            <div 
                ref={ticketRef} 
                className="ticket bg-white text-black p-3 rounded shadow max-w-[300px] print:shadow-none print:rounded-none print:max-w-none print:w-[80mm] print:p-0"
            >
                <div className="text-center mb-1">
                    <div className="ticket-logo">
                        <img src="/El-Vaquiano.png" alt="Distribuidora El Vaquiano" className="max-w-[200px] mx-auto" crossOrigin="anonymous" />
                    </div>
                    <h2 className="font-bold text-base">RECIBO DE PAGO</h2>
                    <div className="text-xs font-semibold">#{String(recibo.numero).padStart(6, '0')}</div>
                    <div className="text-[10px] text-gray-600">
                        {new Date(recibo.fecha).toLocaleString('es-AR')}
                    </div>
                </div>

                <hr className="my-2 border-gray-300" />

                <div className="border-b border-gray-200 pb-2 mb-2">
                    <div className="font-bold text-[11px]">{getClienteNombre(recibo.cliente)}</div>
                    {getDireccion(recibo.cliente) && <div className="text-[9px] text-gray-600">{getDireccion(recibo.cliente)}</div>}
                    {getTelefono(recibo.cliente) && <div className="text-[9px] text-gray-600">Tel: {getTelefono(recibo.cliente)}</div>}
                </div>

                <hr className="my-2 border-gray-300" />

                <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                    <span>Detalle</span>
                    <span>Importe</span>
                </div>
                <hr className="my-1 border-gray-300" />

                <div className="mt-1 space-y-1">
                    <div className="py-0.5">
                        <div className="font-bold text-[13px]">{recibo.concepto.toUpperCase()}</div>
                        <div className="text-[10px]">Forma de pago: {getFormaPagoLabel(recibo.formaPago)}</div>
                        <div className="text-right font-bold text-[11px]">{formatARS(recibo.monto)}</div>
                    </div>
                </div>

                <hr className="my-2 border-gray-300" />

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

                <hr className="my-2 border-gray-300" />

                <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL PAGADO</span>
                    <span>{formatARS(recibo.monto)}</span>
                </div>

                <hr className="my-2 border-gray-300" />

                <div className="text-center text-[10px]">
                    <div className="font-bold text-green-700">PAGO REGISTRADO</div>
                    {recibo.deudaAnterior > recibo.monto ? (
                        <div>Saldo restante: <strong>{formatARS(recibo.deudaAnterior - recibo.monto)}</strong></div>
                    ) : (
                        <div className="font-bold text-green-700">DEUDA SALDADA</div>
                    )}
                </div>

                <div className="text-center mt-3 text-[9px] text-gray-500">
                    Este documento es un comprobante interno de pago
                </div>
            </div>

            <div className="no-print mt-6 flex flex-col gap-3 w-full max-w-[300px]">
                <button 
                    onClick={handleEnviarWhatsApp} 
                    className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition shadow-lg shadow-green-900/20"
                >
                    <FaFilePdf size={18} /> Descargar PDF y abrir WhatsApp
                </button>

                <button 
                    onClick={handleImprimir} 
                    className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition shadow-lg shadow-blue-900/20"
                >
                    <FaPrint /> Imprimir Recibo
                </button>
                
                <Link href="/gestion/cuentas-corrientes" className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg text-center font-medium transition">
                    Volver al listado
                </Link>
            </div>
        </div>
    );
}