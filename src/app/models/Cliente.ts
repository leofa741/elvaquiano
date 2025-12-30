import { Schema, model, models } from 'mongoose';

const ClienteSchema = new Schema({
  razonSocial: { type: String, required: true, trim: true },
  nombre: { type: String, required: true, trim: true },
  apellido: { type: String, required: true, trim: true },
  dni: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
    validate: {
      validator: (v: string) => /^\d{7,8}$/.test(v),
      message: 'DNI debe tener 7 u 8 dígitos'
    }
  },
  telefono: { type: String, required: true, trim: true },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  direccion: { type: String, trim: true },
  ciudad: { type: String, trim: true },
  provincia: { type: String, trim: true },
  formaPago: {
    type: String,
    enum: ['efectivo', 'transferencia', 'qr', 'tarjeta', 'cuenta_corriente', 'otro'],
    default: 'efectivo'
  },
  activo: { type: Boolean, default: true },
  alerta: {
    umbralDeuda: { type: Number, default: 50000 },
    revisado: { type: Boolean, default: false },
    ultimaRevision: { type: Date },
    notaAlerta: { type: String, default: '' }
  }
}, {
  timestamps: true
});

const Cliente = models.Cliente || model('Cliente', ClienteSchema);
export default Cliente;