import mongoose, { Schema, Types } from 'mongoose';

const CuentaCorrienteSchema = new Schema(
  {
    cliente: { type: Types.ObjectId, ref: 'Cliente', required: true },

    tipo: {
      type: String,
      enum: ['pedido', 'pago'],
      required: true,
    },

    referenciaId: {
      type: Types.ObjectId,
      required: true,
    },

    descripcion: String,

    saldoAnterior: { type: Number, required: true },
    importe: { type: Number, required: true }, // + pedido / - pago
    saldoActual: { type: Number, required: true },

    formaPago: String,
    notas: String,
  },
  { timestamps: true }
);

export default mongoose.models.CuentaCorriente ||
  mongoose.model('CuentaCorriente', CuentaCorrienteSchema);
