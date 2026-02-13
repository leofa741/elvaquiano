// models/Pedido.ts
import { Schema, model, models } from 'mongoose';

const PedidoSchema = new Schema({
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  productos: [{
    producto: {
      type: Schema.Types.ObjectId,
      ref: 'Product',   // ← CORREGIDO
      required: true
    },
    nombre: { type: String, required: true },
    unidad: { type: String, required: true },
    deposito: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 0.001 },
    tipoPrecio: {
      type: String,
      enum: ['mayorista', 'oferta'],  // ✅ CORRECTO
      required: true
    },
    precioAplicado: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  estado: {
    type: String,
    enum: ['pendiente', 'preparacion', 'enviado', 'entregado', 'cancelado'],
    default: 'pendiente'
  },
  origen: {
    type: String,
    enum: ['online', 'mostrador'],
    required: true,
  },


  // 🔹 NUEVO CAMPO: solo para finanzas
  estadoPago: {
    type: String,
    enum: ['pendiente', 'parcial', 'pagado'],
    default: 'pendiente'
  },
  deposito: { type: String, required: true },
  fechaEstimadaEntrega: Date,
  notas: String,
  total: { type: Number, required: true },
  activo: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default models.Pedido || model('Pedido', PedidoSchema);
