'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import './print.css';
import BotonImprimir from './BotonImprimir';
import BotonConvertir from './BotonConvertir';
import Swal from 'sweetalert2';
import { formatARS } from '@/app/lib/formatcurrenci';

interface Producto {
  nombre: string;
  unidad: string;
  cantidad: number;
  unidadesFisicas: number; // ✅ NUEVA LÍNEA
  tipoPrecio: string;
  precioAplicado: number;
  deposito?: string;
}


interface Cliente {
  direccion?: string;
  telefono?: string;
  razonSocial?: string;

}

interface Presupuesto {
  _id: string;
  cliente: Cliente | string | null;
  productos: Producto[];
  total: number;
  origen: string;
  validoHasta?: string;
  estado: string;
  createdAt: string;
  notas?: string;
  direccion?: string;
  telefono?: string;

}

function getRazonSocial(cliente: any): string {
  if (!cliente) return 'Cliente desconocido';
  if (typeof cliente === 'string') return 'Cliente eliminado';
  return cliente.razonSocial || 'Sin nombre';
}

function getDireccion(presupuesto: Presupuesto): string | null {
  return presupuesto.direccion ||
    (typeof presupuesto.cliente === 'object' && presupuesto.cliente?.direccion) ||
    null;
}

function getTelefono(presupuesto: Presupuesto): string | null {
  return presupuesto.telefono ||
    (typeof presupuesto.cliente === 'object' && presupuesto.cliente?.telefono) ||
    null;
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
    <div className="bg-gray-900 p-4 flex flex-col items-center justify-start min-[print]:min-h-0">

      <p className="text-white text-center mb-4">
        <strong>Presupuesto:</strong> #{presupuesto._id.slice(-6).toUpperCase()}
        <br />
        <span className="text-gray-400 mt-1">volver a la sección de <a href="/gestion/presupuestos" className="text-amber-400 underline">Presupuestos</a>.</span>
      </p>

      <div className="ticket bg-white text-black p-3 rounded shadow max-w-[300px]"> {/* ✅ Padding reducido */}
        <div className="text-center">
          {/* LOGO */}
          <div className="ticket-logo">
            <img
              src="/El-Vaquiano.png"
              alt="Distribuidora El Vaquiano"
            />
          </div>
          <h2 className="font-bold text-base">PRESUPUESTO</h2> {/* ✅ Tamaño reducido */}
          <div className="text-xs">#{presupuesto._id.slice(-6).toUpperCase()}</div>
          {presupuesto.createdAt && (
            <div className="text-[10px] mt-0.5">
              {new Date(presupuesto.createdAt).toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>

        <hr />

        <div className="font-semibold text-sm flex flex-col gap-0.5 mb-1">
          {/* Razón Social */}
          <span className="font-bold text-[11px]">{getRazonSocial(presupuesto.cliente)}</span>

          {/* Dirección y Teléfono en una línea flexible */}
          <div className="flex flex-wrap gap-x-3 text-[10px] text-gray-600 font-light">
            {getDireccion(presupuesto) && (
              <span>📍 {getDireccion(presupuesto)}</span>
            )}
            {getTelefono(presupuesto) && (
              <span>📞 {getTelefono(presupuesto)}</span>
            )}
            {/* Fallback si no hay dirección ni teléfono */}
            {!getDireccion(presupuesto) && !getTelefono(presupuesto) && (
              <span className="italic text-gray-400">consumidor final</span>
            )}
          </div>
        </div>
        <hr className="border-t border-gray-500" />
        <div className="text-[10px] text-gray-600 flex justify-between mt-0.5">
          <span>Cantidad / Descripcion</span>
          <span className='mr-3'>importe</span>
        </div>

        <hr />

        <div className="mt-1 space-y-1"> {/* ✅ Margen y gap reducidos */}
          {presupuesto.productos.map((p, i) => (
            <div key={i} className="py-0.5"> {/* ✅ Padding vertical mínimo */}
              {/* ✅ Siempre usamos p.cantidad como número de unidades físicas */}

              <div className="font-bold text-[13px] text-black leading-tight">
                {p.nombre.toUpperCase()}
              </div>


              <div className="font-semibold text-[10px] text-black leading-tight">
                ({p.cantidad} {p.cantidad === 1 ? 'U' : 'Uds'}) x {formatARS(p.precioAplicado)}
              </div>


              <div className="text-right font-bold text-[11px] leading-tight mt-0.2 mr-3">
                {formatARS(p.cantidad * p.precioAplicado)}
              </div>
            </div>
          ))}
        </div>


        {/* Mostrar nota si existe (ej: "regenerado a partir de...") */}
        {presupuesto.notas && (
          <div className="text-center text-[10px] text-gray-500 italic mt-1 mb-0.5 leading-tight">
            {presupuesto.notas}
          </div>
        )}

        <hr className="my-1" /> {/* ✅ Margen reducido */

        }

        <div className="flex justify-between font-bold text-sm mr-4"> {/* ✅ Más compacto */}
          <span>TOTAL</span>
          <span>{formatARS(presupuesto.total)}</span>
        </div>


        <div className="text-center mt-1 text-[10px] text-gray-500 leading-tight"> {/* ✅ Más compacto */}
          Documento no válido como comprobante fiscal
        </div>

        <div className="no-print mt-3">
          <label className="text-xs text-gray-500 block mb-1">
            Origen del pedido <span className="text-red-400">*</span>
          </label>

          <select
            value={presupuesto.origen || ''}
            onChange={async (e) => {
              const origen = e.target.value;

              await fetch(`/api/gestion/presupuestos/${presupuesto._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origen }),
              });

              setPresupuesto(prev => prev ? { ...prev, origen } : prev);
            }}
            className="w-full bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
            required
          >
            <option value="">Seleccionar...</option>
            <option value="mostrador">Mostrador</option>
            <option value="online">Online (WhatsApp / Web)</option>
          </select>
        </div>

        {/* BOTONES: solo visibles en pantalla */}
        <div className="no-print mt-4 flex flex-col gap-2">
          <BotonImprimir />

          {presupuesto.notas?.includes('Presupuesto regenerado a partir del pedido') ? (
            <div className="text-xs text-gray-500 text-center italic">
              Este presupuesto fue regenerado a partir de un pedido ya existente...
            </div>
          ) : (
            <BotonConvertir id={presupuesto._id} estado={presupuesto.estado} origen={presupuesto.origen} />
          )}
        </div>
      </div>
    </div>
  );
}