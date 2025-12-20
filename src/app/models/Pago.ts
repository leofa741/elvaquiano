// models/Pago.ts
import { Schema, model, models } from 'mongoose';

const PagoSchema = new Schema({
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  pedido: {
    type: Schema.Types.ObjectId,
    ref: 'Pedido',
    required: true
  },
  monto: {
    type: Number,
    required: true,
    min: 0.01
  },
  formaPago: {
    type: String,
    enum: ['efectivo', 'transferencia', 'qr', 'tarjeta', 'cuenta_corriente', 'otro'],
    required: true
  },
  fechaPago: {
    type: Date,
    default: Date.now
  },
  referencia: { // opcional: comprobante, número de operación, etc.
    type: String,
    trim: true
  },
  notas: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // createdAt / updatedAt
});

const Pago = models.Pago || model('Pago', PagoSchema);
export default Pago;