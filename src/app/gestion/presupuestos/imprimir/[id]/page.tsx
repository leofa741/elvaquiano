import connectDB from '@/app/lib/mongoose';
import Presupuesto, { PresupuestoDocument } from '@/app/models/Presupuesto';
import { notFound } from 'next/navigation';
import BotonImprimir from './BotonImprimir';
import BotonConvertir from './BotonConvertir';

import { Types } from 'mongoose';

interface PresupuestoLean {
  _id: Types.ObjectId;
  cliente: {
    _id: Types.ObjectId;
    razonSocial: string;
  };
  productos: Array<{
    nombre: string;
    unidad: string;
    cantidad: number;
    tipoPrecio: string;
    precioAplicado: number;
  }>;
  total: number;
  estado: string;
  validoHasta?: Date | null;
}


interface PresupuestoPoblado extends Omit<PresupuestoDocument, 'cliente'> {
  cliente: {
    _id: string;
    razonSocial: string;
  };
}

export default async function ImprimirPresupuesto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;



  await connectDB();

  const presupuesto = await Presupuesto.findById(id)
  .populate('cliente', 'razonSocial')
  .lean<PresupuestoLean>();
  if (!presupuesto) return notFound();

  return (
    <>
      <div
        className="font-mono text-xs max-w-[300px] mx-auto p-4"
        style={{ fontFamily: 'monospace', fontSize: '12px' }}
      >
        <div className="text-center mb-3">
          <h1 className="font-bold text-lg">PRESUPUESTO</h1>
          <p className="text-sm">#{presupuesto._id.toString().slice(-6).toUpperCase()}</p>

          {presupuesto.validoHasta && (
            <p className="text-xs">
              Válido hasta: {new Date(presupuesto.validoHasta).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="mb-3">
          <p><strong>{presupuesto.cliente.razonSocial}</strong></p>
        </div>

        <hr className="my-2 border-gray-400" />

        {presupuesto.productos.map((p, i) => (
          <div key={i} className="flex justify-between mb-1">
            <span>
              {p.cantidad} {p.unidad} {p.nombre}
              <br />
              <span className="text-[10px]">({p.tipoPrecio})</span>
            </span>
            <span>${(p.cantidad * p.precioAplicado).toFixed(2)}</span>
          </div>
        ))}

        <hr className="my-2 border-gray-400" />

        <div className="flex justify-between font-bold text-lg">
          <span>TOTAL</span>
          <span>${presupuesto.total.toFixed(2)}</span>
        </div>

        <div className="text-center mt-4 text-[10px] text-gray-500">
          Documento no válido como comprobante fiscal
        </div>

        <div className="text-center mt-6">
          <BotonImprimir />
        </div>
      </div>

      <div className="text-center mt-8">
        <BotonConvertir
          id={presupuesto._id.toString()}
          estado={presupuesto.estado}
        />
      </div>
    </>
  );
}
