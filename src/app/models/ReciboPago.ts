import mongoose, { Schema } from 'mongoose';

const ReciboPagoSchema = new Schema({
  numero: { type: Number, required: true, unique: true },
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
  monto: { type: Number, required: true },
  formaPago: { type: String, required: true },
  concepto: { type: String, default: 'Pago de deuda' },
  deudaAnterior: { type: Number, default: 0 },
  fecha: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.ReciboPago || mongoose.model('ReciboPago', ReciboPagoSchema);

