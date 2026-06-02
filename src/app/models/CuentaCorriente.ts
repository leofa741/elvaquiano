import mongoose, { Schema, Types } from 'mongoose';

const CuentaCorrienteSchema = new Schema(
  {
    cliente: {
      type: Types.ObjectId,
      ref: 'Cliente',
      required: true,
    },
    pedido: {
      type: Types.ObjectId,
      ref: 'Pedido',
      required: false,
    },
    tipo: {
      type: String,
      enum: ['pedido', 'pago', 'ajuste'],
      required: true,
    },
    referenciaId: {
      type: Types.ObjectId,
      required: false,
    },
    descripcion: {
      type: String,
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    saldoAnterior: {
      type: Number,
      required: true,
      default: 0,
    },
    importe: {
      type: Number,
      required: true,
    },
    saldoActual: {
      type: Number,
      required: true,
    },
    formaPago: {
      type: String,
      default: 'saldo pendiente',
      // ✅ SIN ENUM - acepta cualquier valor
    },
    notas: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.CuentaCorriente ||
  mongoose.model('CuentaCorriente', CuentaCorrienteSchema);