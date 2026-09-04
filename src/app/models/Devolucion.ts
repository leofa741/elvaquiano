import mongoose from 'mongoose';

const DevolucionSchema = new mongoose.Schema(
  {
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    nombreProducto: { type: String, required: true }, // Se guarda por si el producto se borra
    tipo: { type: String, enum: ['cliente', 'proveedor'], required: true },
    cantidad: { type: Number, required: true },
    motivo: { type: String, required: true },
    lote: { type: String },
    notas: { type: String },
    usuario: { type: String, required: true }, // Email o nombre del que hizo la acción
    fecha: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Evitar error de compilación en Next.js por re-declaración del modelo
export default mongoose.models.Devolucion || mongoose.model('Devolucion', DevolucionSchema);