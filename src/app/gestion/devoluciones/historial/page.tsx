'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, History, Printer } from 'lucide-react';
import Link from 'next/link';

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

export default function HistorialDevolucionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [historial, setHistorial] = useState<DevolucionRecord[]>([]);
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
        } else {
          router.push('/');
        }
      } catch { router.push('/'); }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchHistorial = async () => {
      try {
        const res = await fetch('/api/gestion/devoluciones');
        if (res.ok) {
          const data = await res.json();
          setHistorial(data.devoluciones || []);
        }
      } catch (err) {
        console.error('Error cargando historial', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistorial();
  }, [isAuthorized]);

  if (!isAuthorized) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-gray-900 text-white">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/gestion/devoluciones" className="p-2 hover:bg-gray-800 rounded-full transition">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <History className="text-amber-500" /> Historial de Devoluciones
          </h1>
          <p className="text-gray-400 text-sm">Últimos 100 movimientos registrados en el sistema.</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando historial...</div>
        ) : historial.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay registros de devoluciones aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-900 text-gray-300 uppercase text-xs">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Cantidad</th>
                  <th className="py-3 px-4">Motivo</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Notas</th>
                  <th className="py-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {historial.map((reg) => (
                  <tr key={reg._id} className="hover:bg-gray-750 transition">
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                      {new Date(reg.fecha).toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{reg.nombreProducto}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${reg.tipo === 'cliente'
                          ? 'bg-green-900/30 text-green-400 border border-green-800'
                          : 'bg-red-900/30 text-red-400 border border-red-800'
                        }`}>
                        {reg.tipo === 'cliente' ? 'De Cliente' : 'A Proveedor'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-amber-400 font-bold">
                      {reg.tipo === 'cliente' ? '+' : '-'}{reg.cantidad}
                    </td>
                    <td className="py-3 px-4 text-gray-300">{reg.motivo}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{reg.usuario}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs max-w-xs truncate" title={reg.notas}>
                      {reg.notas || (reg.lote ? `Lote: ${reg.lote}` : '—')}
                    </td>
                   
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/gestion/devoluciones/historial/${reg._id}/imprimir?autoPrint=true`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition"
                        title="Imprimir nota térmica"
                      >
                        <Printer size={14} />
                        <span className="hidden md:inline">Ticket</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}