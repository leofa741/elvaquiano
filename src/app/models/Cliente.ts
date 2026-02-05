// app/models/Cliente.ts
import { Schema, model, models } from 'mongoose';

// 🔧 Función de normalización (puedes reutilizarla en el API también)
const normalizeRazonSocial = (text: string): string => {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')  // Eliminar todos los espacios
    .normalize('NFD')      // Eliminar tildes
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ''); // Solo letras y números
};

const normalizeTelefono = (text: string): string => {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9+]/g, ''); // Solo números y +
};

const ClienteSchema = new Schema({
  razonSocial: { type: String, required: true, trim: true },
  razonSocialNormalized: { 
    type: String, 
    required: true,
    unique: true,
    index: true,
    trim: true 
  },
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
  telefonoNormalized: { 
    type: String, 
    required: true,
    index: true,
    trim: true 
  },
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
  },
  origen: { type: String, default: 'presencial' }
}, {
  timestamps: true
});

// 🔧 Middleware para normalizar automáticamente antes de guardar
ClienteSchema.pre('save', function(next) {
  if (this.razonSocial && !this.razonSocialNormalized) {
    this.razonSocialNormalized = normalizeRazonSocial(this.razonSocial);
  }
  if (this.telefono && !this.telefonoNormalized) {
    this.telefonoNormalized = normalizeTelefono(this.telefono);
  }
  next();
});

// 🔧 Middleware para validación antes de guardar
ClienteSchema.pre('save', async function(next) {
  const ClienteModel = this.constructor as any;
  
  // Si es nuevo o si cambió la razón social
  if (this.isNew || this.isModified('razonSocial')) {
    const existing = await ClienteModel.findOne({
      razonSocialNormalized: this.razonSocialNormalized,
      _id: { $ne: this._id }
    });
    
    if (existing) {
      const error = new Error('Ya existe un cliente con esta razón social');
      (error as any).statusCode = 409;
      return next(error);
    }
  }
  
  // Si es nuevo o si cambió el teléfono
  if (this.isNew || this.isModified('telefono')) {
    const existing = await ClienteModel.findOne({
      telefonoNormalized: this.telefonoNormalized,
      _id: { $ne: this._id }
    });
    
    if (existing) {
      const error = new Error('Ya existe un cliente con este teléfono');
      (error as any).statusCode = 409;
      return next(error);
    }
  }
  
  next();
});

const Cliente = models.Cliente || model('Cliente', ClienteSchema);
export default Cliente;