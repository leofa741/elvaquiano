// models/Presupuesto.ts
import { Schema, model, models, Document } from 'mongoose';

export interface PresupuestoDocument extends Document {
  _id: string;
  cliente: string;
  productos: Array<{
    producto: string;
    nombre: string;
    unidad: string;
    categoria?: string;          // <-- NUEVO
    pesoAproximado?: number;     // <-- NUEVO
    deposito: string;
    cantidad: number;
    tipoPrecio: 'mayorista' | 'oferta';
    precioAplicado: number;
    subtotal: number;
  }>;
  // ... (el resto de tu interfaz queda igual)
}

const PresupuestoSchema = new Schema({
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
  productos: [{
    producto: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, // Nota: cambié 'Producto' a 'Product' para que coincida con tu modelo de producto
    nombre: { type: String, required: true },
    unidad: { type: String, required: true },
    categoria: { type: String, required: false },          // <-- NUEVO
    pesoAproximado: { type: Number, required: false, default: null }, // <-- NUEVO
    deposito: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 0.001 },
    tipoPrecio: { type: String, enum: ['mayorista', 'oferta'], required: true },
    precioAplicado: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  estado: { type: String, enum: ['borrador', 'enviado', 'aceptado', 'rechazado', 'convertido'], default: 'borrador' },
  total: { type: Number, required: true },
  notas: { type: String },
  origen: { type: String, enum: ['online', 'mostrador'], required: true },
  validoHasta: Date,
  pedidoAsociado: { type: Schema.Types.ObjectId, ref: 'Pedido' },
  vistoPorAdmin: { type: Boolean, default: false },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const Presupuesto = models.Presupuesto || model<PresupuestoDocument>('Presupuesto', PresupuestoSchema);
export default Presupuesto;