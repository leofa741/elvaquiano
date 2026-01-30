// models/Presupuesto.ts
import { Schema, model, models, Document } from 'mongoose';

// 👇 Interfaz para tipado
export interface PresupuestoDocument extends Document {
  _id: string;
  cliente: string;
  productos: Array<{
    producto: string;
    nombre: string;
    unidad: string;
    deposito: string;
    cantidad: number;
    tipoPrecio: 'mayorista' | 'oferta';
    precioAplicado: number;
    subtotal: number;
  }>;
  estado: 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'convertido';
  total: number;
  notas?: string;
  validoHasta?: Date | null;
  pedidoAsociado?: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PresupuestoSchema = new Schema({
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  productos: [{
    producto: {
      type: Schema.Types.ObjectId,
      ref: 'Producto',
      required: true
    },
    nombre: { type: String, required: true },
    unidad: { type: String, required: true },
    deposito: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 0.001 },
    tipoPrecio: {
      type: String,
      enum: ['mayorista', 'oferta'],
      required: true
    },
    precioAplicado: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  estado: {
    type: String,
    enum: ['borrador', 'enviado', 'aceptado', 'rechazado', 'convertido'],
    default: 'borrador'
  },
  total: { type: Number, required: true },
  notas: { type: String },
  origen: {
    type: String,
    enum: ['online', 'mostrador'],
    required: true
  },
  validoHasta: Date,
  pedidoAsociado: {
    type: Schema.Types.ObjectId,
    ref: 'Pedido'
  },
  vistoPorAdmin: {
    type: Boolean,
    default: false
  },
  activo: { type: Boolean, default: true }
}, {
  timestamps: true
});

const Presupuesto = models.Presupuesto || model<PresupuestoDocument>('Presupuesto', PresupuestoSchema);
export default Presupuesto;