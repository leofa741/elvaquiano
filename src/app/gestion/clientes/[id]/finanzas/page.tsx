'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import Link from 'next/link';
import { FaArrowLeft, FaMoneyBillWave, FaClock, FaFileInvoice, FaHistory } from 'react-icons/fa';

interface Cliente {
  _id: string;
  razonSocial: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  formaPago: string;
}

interface PedidoDeuda {
  _id: string;
  total: number;
  createdAt: string;
  estado: string;
  estadoPago: string;
  saldo: number;
}

interface PagoHistorial {
  _id: string;
  monto: number;
  formaPago: string;
  fechaPago: string;
  referencia?: string;
  notas?: string;
  pedidoId?: string;
  pedidoTotal?: number;
}

interface FinanzasData {
  cliente: Cliente;
  deudaTotal: number;
  pedidosConDeuda: PedidoDeuda[];
  historialPagos: PagoHistorial[];
}

const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  qr: 'QR',
  tarjeta: 'Tarjeta',
  cuenta_corriente: 'Cta. Corriente',
  otro: 'Otro'
};

export default function ClienteFinanzasPage() {
  const { id } = useParams();
  const router = useRouter();
  const isAuthorized = useAdminAuthorization();
  const [data, setData] = useState<FinanzasData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthorized || !id) return;

    const fetchFinanzas = async () => {
      try {
        const res = await fetch(`/api/gestion/clientes/${id}/finanzas`);
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Error al cargar finanzas');
          router.push('/gestion/clientes');
          return;
        }
        const finanzasData = await res.json();
        setData(finanzasData);
      } catch (err) {
        console.error(err);
        alert('Error de conexión');
        router.push('/gestion/clientes');
      } finally {
        setLoading(false);
      }
    };

    fetchFinanzas();
  }, [id, isAuthorized, router]);

  if (!isAuthorized) return null;
  if (loading) return <div className="p-8 text-center text-gray-400">Cargando finanzas...</div>;
  if (!data) return null;

  const { cliente, deudaTotal, pedidosConDeuda, historialPagos } = data;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/gestion/dashboard"
          className="flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-4"
        >
          <FaArrowLeft /> Volver
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
          <FaMoneyBillWave className="text-amber-400" />
          Finanzas de {cliente.razonSocial}
        </h1>
        <p className="text-gray-400">
          {cliente.nombre} {cliente.apellido} • {cliente.telefono} • {cliente.formaPago}
        </p>
      </div>

      {/* Resumen financiero */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-850 p-5 rounded-xl border border-amber-900/30 mb-6 shadow-lg">
        <div className="text-3xl font-bold text-amber-400">
          ${deudaTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </div>
        <div className="text-gray-300 mt-2">
          Deuda total en {pedidosConDeuda.length} pedido(s) pendiente(s)
        </div>

        {deudaTotal > 0 && (
          <button
            onClick={() => router.push(`/gestion/clientes/${cliente._id}/pagos/multiple`)}
            className="mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-all"
          >
            <FaMoneyBillWave />
            Pagar toda la deuda (${deudaTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })})
          </button>
        )}
      </div>

      {/* Pedidos con deuda */}
      {pedidosConDeuda.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-bold text-white flex items-center gap-2">
              <FaFileInvoice className="text-amber-400" /> Pedidos con saldo pendiente
            </h2>
          </div>
          <div className="divide-y divide-gray-700">
            {pedidosConDeuda.map((p) => (
              <div key={p._id} className="p-4 hover:bg-gray-750 transition-colors">
                <div className="flex flex-col md:flex-row md:justify-between gap-3">
                  <div>
                    <Link
                      href={`/gestion/pedidos/${p._id}`}
                      className="text-amber-400 hover:underline font-medium text-lg"
                    >
                      # {p._id.slice(-6).toUpperCase()}
                    </Link>
                    <div className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                      <FaClock />
                      {new Date(p.createdAt).toLocaleDateString('es-AR')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Estado: {p.estado} • Pago: {p.estadoPago}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      ${p.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-400">
                      de ${p.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </div>
                    <Link
                      href={`/gestion/pedidos/${p._id}/pagos/nuevo`}
                      className="mt-2 inline-block bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Registrar pago
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total acumulado */}
          <div className="p-4 bg-gray-900 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">Total pendiente:</span>
              <span className="text-xl font-bold text-white">
                $
                {pedidosConDeuda
                  .reduce((acc, p) => acc + p.saldo, 0)
                  .toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Historial de pagos */}
      {historialPagos.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-bold text-white flex items-center gap-2">
              <FaHistory className="text-blue-400" /> Historial de pagos
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Últimos {historialPagos.length} movimientos
            </p>
          </div>
          <div className="divide-y divide-gray-700">
            {historialPagos.map((pago) => (
              <div key={pago._id} className="p-4 text-sm">
                <div className="flex flex-col md:flex-row md:justify-between gap-2">
                  <div>
                    <span className="font-medium text-white">
                      ${pago.monto.toFixed(2)}
                    </span>
                    <span className="mx-2 text-gray-500">•</span>
                    <span className="text-gray-300">
                      {FORMA_PAGO_LABEL[pago.formaPago] || pago.formaPago}
                    </span>
                    {pago.referencia && (
                      <span className="ml-2 text-gray-400">(Ref: {pago.referencia})</span>
                    )}
                  </div>
                  <div className="text-right text-gray-400">
                    {new Date(pago.fechaPago).toLocaleDateString('es-AR')}
                    {' '}
                    {new Date(pago.fechaPago).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Pedido asociado */}
                {pago.pedidoId && (
                  <div className="mt-2 text-xs text-white bg-gray-500 inline-block px-2 py-1 rounded">
                    Pedido #{pago.pedidoId.slice(-6).toUpperCase()} •
                    Total: ${pago.pedidoTotal?.toFixed(2)}
                  </div>
                )}

                {/* Notas */}
                {pago.notas && (
                  <div className="mt-1 text-xs text-gray-400 italic">
                    "{pago.notas}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {historialPagos.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <FaHistory className="mx-auto text-2xl mb-2 opacity-50" />
          No hay pagos registrados para este cliente.
        </div>
      )}
    </div>
  );
}