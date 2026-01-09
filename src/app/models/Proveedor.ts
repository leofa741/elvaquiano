// models/Proveedor.ts
import { Schema, model, models } from 'mongoose';

const ProveedorSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      unique: true,
      maxlength: [100, 'El nombre es demasiado largo'],
    },
   
    telefono: {
      type: String,
      trim: true,
      required: false,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: false,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
   
  },
  {
    timestamps: true,
  }
);

const Proveedor = models.Proveedor || model('Proveedor', ProveedorSchema);
export default Proveedor;