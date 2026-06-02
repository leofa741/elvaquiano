'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import { useForm, Controller } from 'react-hook-form';
import { formatARS, parseARS } from '@/app/lib/formatcurrenci';

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
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const isAuthorized = useAdminAuthorization();
  
  const {
    register,
    control,
    handleSubmit,
    setValue, // 👈 Agregado para precargar valores
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      formaPago: 'efectivo',
      referencia: '',
      notas: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [saldoPendiente, setSaldoPendiente] = useState<number | null>(null);

  // 👈 Cargar el saldo pendiente y precargar el formulario al montar
  useEffect(() => {
    if (!id) return;
    
    const fetchSaldo = async () => {
      try {
        const res = await fetch(`/api/gestion/pedidos/${id}/saldo`);
        if (res.ok) {
          const data = await res.json();
          setSaldoPendiente(data.saldoPendiente);
          // Precargamos el monto en el formulario
          setValue('monto', data.saldoPendiente);
        }
      } catch (err) {
        console.error('Error al cargar saldo:', err);
      }
    };
    
    fetchSaldo();
  }, [id, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!id || !isAuthorized) return;

    setLoading(true);
    try {
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

      {/* 👈 Indicador visual del saldo pendiente */}
      {saldoPendiente !== null && (
        <div className="mb-4 p-3 bg-gray-750 rounded border border-gray-600">
          <p className="text-sm text-gray-300">Saldo pendiente del pedido:</p>
          <p className="text-xl font-bold text-amber-400">{formatARS(saldoPendiente)}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm mb-1">Monto *</label>
          <Controller
            name="monto"
            control={control}
            rules={{ required: true, min: 0.01 }}
            render={({ field }) => {
              // Estado local para manejar el enmascaramiento visual
              const [displayValue, setDisplayValue] = useState(
                field.value ? formatARS(field.value) : ''
              );

              // 👈 Sincronizar el valor visual cuando cambia externamente (ej. al cargar el saldo)
              useEffect(() => {
                if (field.value) {
                  setDisplayValue(formatARS(field.value));
                } else {
                  setDisplayValue('');
                }
              }, [field.value]);

              return (
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="$ 0,00"
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={displayValue}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.,]/g, '');
                    setDisplayValue(raw);
                    const numeric = parseARS(raw);
                    field.onChange(numeric || 0);
                  }}
                  onBlur={() => {
                    const numeric = parseARS(displayValue);
                    field.onChange(numeric || 0);
                    setDisplayValue(numeric ? formatARS(numeric) : '');
                  }}
                  onFocus={() => {
                    const numeric = parseARS(displayValue);
                    // Al enfocar, mostramos el número plano con coma decimal para editar fácil
                    setDisplayValue(numeric ? numeric.toString().replace('.', ',') : '');
                  }}
                />
              );
            }}
          />
          {errors.monto && (
            <span className="text-red-400 text-xs mt-1 block">
              El monto es obligatorio y debe ser mayor a 0
            </span>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-1">Forma de pago *</label>
          <select
            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
            {...register('referencia')}
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm mb-1">Notas (opcional)</label>
          <textarea
            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
            {...register('notas')}
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded disabled:opacity-50 transition flex-1"
          >
            {loading ? 'Guardando...' : 'Registrar pago'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}