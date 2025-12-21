'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import { useForm } from 'react-hook-form';

type FormData = {
  monto: number;
  formaPago: string;
  referencia: string;
  notas: string;
};

const FORMAS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'qr', label: 'QR' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'cuenta_corriente', label: 'Cuenta Corriente' },
  { value: 'otro', label: 'Otro' },
];

export default function NuevoPagoPage() {
  const { id } = useParams();
  const router = useRouter();
  const isAuthorized = useAdminAuthorization();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: FormData) => {
    if (!id || !isAuthorized) return;
    
    setLoading(true);
    try {
      // Obtener clienteId desde el pedido (para validación)
      const pedidoRes = await fetch(`/api/gestion/pedidos/${id}`);
      const pedido = await pedidoRes.json();
      
      const res = await fetch('/api/gestion/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: pedido.cliente._id,
          pedidoId: id,
          monto: data.monto,
          formaPago: data.formaPago,
          referencia: data.referencia || undefined,
          notas: data.notas || undefined
        })
      });

      if (res.ok) {
        router.push(`/gestion/pedidos/${id}`);
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (err) {
      alert('Error de red');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) return null;

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">Registrar pago</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm mb-1">Monto *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="w-full p-2 bg-gray-700 text-white rounded"
            {...register('monto', { required: true, min: 0.01 })}
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-1">Forma de pago *</label>
          <select
            className="w-full p-2 bg-gray-700 text-white rounded"
            {...register('formaPago', { required: true })}
          >
            {FORMAS_PAGO.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-1">Referencia (opcional)</label>
          <input
            type="text"
            className="w-full p-2 bg-gray-700 text-white rounded"
            {...register('referencia')}
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-1">Notas (opcional)</label>
          <textarea
            className="w-full p-2 bg-gray-700 text-white rounded"
            {...register('notas')}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Registrar pago'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}