'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { FaArrowLeft, FaMoneyBillWave } from 'react-icons/fa';

interface Cliente {
  razonSocial: string;
}

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

export default function PagoMultiplePage() {
  const { id } = useParams();
  const router = useRouter();
  const isAuthorized = useAdminAuthorization();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { monto: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<{ razonSocial: string } | null>(null);
  const [deudaTotal, setDeudaTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const monto = watch('monto');

  useEffect(() => {
    if (!isAuthorized || !id) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/gestion/clientes/${id}/finanzas`);
        const data = await res.json();
        setCliente(data.cliente);
        setDeudaTotal(data.deudaTotal);
        setValue('monto', data.deudaTotal); // por defecto, pagar todo
      } catch (err) {
        router.push(`/gestion/clientes/${id}/finanzas`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isAuthorized, router, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!id || data.monto <= 0) return;

    if (data.monto > deudaTotal) {
      alert(`El monto no puede superar la deuda total de $${deudaTotal.toFixed(2)}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/gestion/pagos/multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: id,
          montoTotal: parseFloat(data.monto.toFixed(2)),
          formaPago: data.formaPago,
          referencia: data.referencia || undefined,
          notas: data.notas || undefined,
          tipo: data.monto >= deudaTotal ? 'total' : 'parcial'
        })
      });

      if (res.ok) {
        router.push(`/gestion/clientes/${id}/finanzas`);
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthorized) return null;
  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
      <Link
        href={`/gestion/clientes/${id}/finanzas`}
        className="flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-4"
      >
        <FaArrowLeft /> Volver a finanzas
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Pagar deuda del cliente</h1>
      <p className="text-gray-400 mb-6">
        Cliente: <span className="text-white">{cliente?.razonSocial}</span>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Monto */}
        <div>
          <label className="block text-gray-300 text-sm mb-1">
            Monto a pagar * (deuda total: ${deudaTotal.toFixed(2)})
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={deudaTotal}
            className="w-full p-2 bg-gray-700 text-white rounded"
            {...register('monto', { 
              required: 'El monto es obligatorio',
              min: { value: 0.01, message: 'Mínimo $0.01' },
              max: { value: deudaTotal, message: `No puede superar $${deudaTotal.toFixed(2)}` }
            })}
          />
          {errors.monto && (
            <p className="text-red-400 text-sm mt-1">{errors.monto.message}</p>
          )}
          
          {/* Botones rápidos */}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setValue('monto', deudaTotal)}
              className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded"
            >
              Pagar todo
            </button>
            <button
              type="button"
              onClick={() => setValue('monto', Math.min(5000, deudaTotal))}
              className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded"
            >
              $5.000
            </button>
          </div>
        </div>

        {/* Forma de pago */}
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
            disabled={submitting}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <FaMoneyBillWave />
            {submitting ? 'Procesando...' : `Pagar $${monto.toFixed(2)}`}
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