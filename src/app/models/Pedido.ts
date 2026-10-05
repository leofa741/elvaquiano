// models/Pedido.ts
import { Schema, model, models } from 'mongoose';

const PedidoSchema = new Schema({
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
  productos: [{
    producto: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    nombre: { type: String, required: true },
    unidad: { type: String, required: true },
    categoria: { type: String, required: false },
    pesoAproximado: { type: Number, required: false, default: null },
    deposito: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 0.001 },
    tipoPrecio: { type: String, enum: ['mayorista', 'oferta'], required: true },
    precioAplicado: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  estado: { type: String, enum: ['pendiente', 'preparacion', 'enviado', 'entregado', 'cancelado'], default: 'pendiente' },
  origen: { type: String, enum: ['online', 'mostrador'], required: true },
  estadoPago: { type: String, enum: ['pendiente', 'parcial', 'pagado'], default: 'pendiente' },
  deposito: { type: String, required: true },
  fechaEstimadaEntrega: Date,
  notas: String,
  total: { type: Number, required: true },
  activo: { type: Boolean, default: true },
  
  // ✅ NUEVO: Flag de seguridad para evitar descontar stock duplicado
  stockDescontado: { type: Boolean, default: false }
  
}, { timestamps: true });

export default models.Pedido || model('Pedido', PedidoSchema);