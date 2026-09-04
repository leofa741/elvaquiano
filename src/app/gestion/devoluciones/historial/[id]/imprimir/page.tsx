'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import Swal from 'sweetalert2';
import './print.css';

interface DevolucionRecord {
  _id: string;
  nombreProducto: string;
  tipo: 'cliente' | 'proveedor';
  cantidad: number;
  motivo: string;
  lote?: string;
  notas?: string;
  usuario: string;
  fecha: string;
}

export default function ImprimirDevolucionTermicaPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [devolucion, setDevolucion] = useState<DevolucionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/'); return; }
    
    const token = session?.user?.token || localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (['admin', 'superadmin', 'vendedor'].includes(payload.role)) {
          setIsAuthorized(true);
        } else { router.push('/'); }
      } catch { router.push('/'); }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!isAuthorized || !id) return;
    const fetchDevolucion = async () => {
      try {
        const res = await fetch(`/api/gestion/devoluciones/${id}`, { cache: 'no-store' });
        if (!res.ok) {
          Swal.fire('Error', 'Devolución no encontrada', 'error');
          router.push('/gestion/devoluciones/historial');
          return;
        }
        setDevolucion(await res.json());
      } catch (err) {
        console.error('Error:', err);
        router.push('/gestion/devoluciones/historial');
      } finally {
        setLoading(false);
      }
    };
    fetchDevolucion();
  }, [isAuthorized, id, router]);

  useEffect(() => {
    if (!loading && devolucion && searchParams.get('autoPrint') === 'true') {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, devolucion, searchParams]);

  const handleImprimir = () => window.print();

  if (!isAuthorized || loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Cargando...</div>;
  }

  if (!devolucion) return null;

  const numeroNota = devolucion._id.slice(-6).toUpperCase();
  const esCliente = devolucion.tipo === 'cliente';

  return (
    <div className="min-h-screen bg-gray-900 p-4 flex flex-col items-center">
      
      {/* Botones solo para pantalla */}
      <div className="no-print w-full max-w-[80mm] mb-6 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-white mb-2">
          <Link href="/gestion/devoluciones/historial" className="p-2 hover:bg-gray-800 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          <span className="text-sm">Vista previa</span>
        </div>
        <button
          onClick={handleImprimir}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition"
        >
          <Printer size={18} /> IMPRIMIR TICKET
        </button>
      </div>

      {/* TICKET TÉRMICO (Se ve igual en pantalla y en impresión) */}
      <div className="ticket ticket-preview">
        
        {/* Logo */}
        <div className="ticket-logo">
          <img src="/El-Vaquiano.png" alt="Logo" />
        </div>

        {/* Encabezado */}
        <h2>NOTA DE DEVOLUCIÓN</h2>
        <div className="text-subtitle">
          {esCliente ? 'INGRESO (De Cliente)' : 'EGRESO (A Proveedor)'}
        </div>
        <div className="text-meta">N° {numeroNota}</div>
        <div className="text-meta">
          {new Date(devolucion.fecha).toLocaleDateString('es-AR')} {' '}
          {new Date(devolucion.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </div>

        <hr />

        {/* Producto */}
        <div className="devolucion-item">
          <div className="nombre">{devolucion.nombreProducto}</div>
          <div className="detalle">Motivo: {devolucion.motivo}</div>
          {devolucion.lote && <div className="detalle">Lote: {devolucion.lote}</div>}
          <div className="detalle">Usuario: {devolucion.usuario}</div>
        </div>

        <hr />

        {/* Impacto en Stock (Destacado) */}
        <div className="devolucion-total">
          <span>CANTIDAD:</span>
          <span>{esCliente ? '+' : '-'} {devolucion.cantidad}</span>
        </div>

        {/* Notas (si existen) */}
        {devolucion.notas && (
          <>
            <hr />
            <div className="devolucion-notas">
              <strong>OBS:</strong> {devolucion.notas}
            </div>
          </>
        )}

        {/* Footer */}
        <hr />
        <div className="ticket-footer">
          <p>Documento interno de control</p>
          <p>Distribuidora El Vaquiano</p>
          <p className="mt-2">*** Gracias ***</p>
        </div>

      </div>
    </div>
  );
}