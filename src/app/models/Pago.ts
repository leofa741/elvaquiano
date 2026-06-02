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
    required: false // ✅ Cambiado a false para permitir pagos sin pedido asociado
  },
  monto: {
    type: Number,
    required: true,
    min: 0.01
  },
  formaPago: {
    type: String,
    enum: ['efectivo', 'transferencia', 'qr', 'tarjeta', 'cheque', 'cuenta_corriente', 'otro'],
    required: true
  },
  fechaPago: {
    type: Date,
    default: Date.now
  },
  referencia: {
    type: String,
    trim: true
  },
  notas: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

const Pago = models.Pago || model('Pago', PagoSchema);
export default Pago;