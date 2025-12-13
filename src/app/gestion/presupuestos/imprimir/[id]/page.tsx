'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import './print.css';
import BotonImprimir from './BotonImprimir';
import BotonConvertir from './BotonConvertir';
import Swal from 'sweetalert2';

interface Producto {
  nombre: string;
  unidad: string;
  cantidad: number;
  tipoPrecio: string;
  precioAplicado: number;
  deposito?: string;
}

interface Cliente {
  razonSocial?: string;
}

interface Presupuesto {
  _id: string;
  cliente: Cliente | string | null;
  productos: Producto[];
  total: number;
  validoHasta?: string;
  estado: string;
}

function getRazonSocial(cliente: any): string {
  if (!cliente) return 'Cliente desconocido';
  if (typeof cliente === 'string') return 'Cliente eliminado';
  return cliente.razonSocial || 'Sin nombre';
}

export default function ImprimirPresupuestoPage() {
  const { id } = useParams();
  const router = useRouter();
  const auth = useAdminAuthorization();
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth !== true || !id) return;

    const fetchPresupuesto = async () => {
      try {
        const res = await fetch(`/api/gestion/presupuestos/${id}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          if (res.status === 404) {
            Swal.fire('Error', 'Presupuesto no encontrado', 'error');
          } else if (res.status === 403) {
            Swal.fire('Acceso denegado', 'No tienes permisos para ver este presupuesto', 'warning');
          } else {
            Swal.fire('Error', 'No se pudo cargar el presupuesto', 'error');
          }
          router.push('/gestion/presupuestos');
          return;
        }

        const data = await res.json();
        setPresupuesto(data);
      } catch (err) {
        console.error('Error de red:', err);
        Swal.fire('Error de conexión', 'Verifica tu conexión e intenta nuevamente', 'error');
        router.push('/gestion/presupuestos');
      } finally {
        setLoading(false);
      }
    };

    fetchPresupuesto();
  }, [auth, id, router]);

  // Mientras se verifica la autorización
  if (auth === null || loading) {
    return (
      <div className="p-6 text-center text-gray-400 min-h-screen flex items-center justify-center">
        Cargando...
      </div>
    );
  }

  // Si no autorizado
  if (auth === false) {
    return null;
  }

  // Si ya se cargó pero no hay datos (no debería pasar por el redirect de arriba)
  if (!presupuesto) {
    return (
      <div className="p-6 text-center text-red-400 min-h-screen flex flex-col items-center justify-center gap-4">
        <div>No se pudo cargar el presupuesto.</div>
        <button
          onClick={() => router.push('/gestion/presupuestos')}
          className="text-amber-400 hover:underline"
        >
          Volver a la lista
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 flex flex-col items-center justify-start">
      <div className="ticket bg-white text-black p-4 rounded shadow max-w-[300px]">
        <div className="text-center">
          <h2 className="font-bold text-lg">PRESUPUESTO</h2>
          <div className="text-sm">#{presupuesto._id.slice(-6).toUpperCase()}</div>
          {presupuesto.validoHasta && (
            <div className="text-xs mt-1">
              Válido hasta {new Date(presupuesto.validoHasta).toLocaleDateString('es-AR')}
            </div>
          )}
        </div>

        <hr />

        <div className="font-medium">{getRazonSocial(presupuesto.cliente)}</div>

        <hr />

        <div className="mt-2 space-y-2">
          {presupuesto.productos.map((p, i) => (
            <div key={i}>
              <div>
                {p.cantidad} {p.unidad} {p.nombre}
              </div>
              <div className="text-xs text-gray-600">
                ({p.tipoPrecio}) x ${p.precioAplicado.toFixed(2)}
              </div>
              <div className="text-right font-medium">
                ${(p.cantidad * p.precioAplicado).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <hr className="my-2" />

        <div className="flex justify-between font-bold text-base">
          <span>TOTAL</span>
          <span>${presupuesto.total.toFixed(2)}</span>
        </div>

        <div className="text-center mt-3 text-xs text-gray-500">
          Documento no válido como comprobante fiscal
        </div>

        {/* BOTONES: solo visibles en pantalla */}
        <div className="no-print mt-4 flex flex-col gap-2">
          <BotonImprimir />
          <BotonConvertir id={presupuesto._id} estado={presupuesto.estado} />
        </div>
      </div>
    </div>
  );
}