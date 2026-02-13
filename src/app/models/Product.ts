// app/models/Product.ts
import { Schema, model, models } from 'mongoose';

const stockSchema = new Schema({
  deposito: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 0 },
});

const loteSchema = new Schema({
  lote: { type: String, required: false },
  vencimiento: { type: Date, required: false },
  cantidad: { type: Number, required: false, min: 0 },
  deposito: { type: String, required: false },
});




const productSchema = new Schema({
  nombre: { type: String, required: true, trim: true },
  categoria: { type: String, required: true, trim: true },
  unidad: {
    type: String,
    enum: ['kg', 'caja', 'pack', 'unidad', 'litro'],
    required: true,
  },
  cantidadUnidad: { type: Number, required: true, min: 0.001 }, // Ej: 0.5 kg en un pack de 500g
  precioLista: { type: Number, required: false, min: 0 },
  precioMayorista: { type: Number, required: true, min: 0 },  
  precioOferta: { type: Number, required: false, min: 0 },
  stock: [stockSchema],
  lotes: [loteSchema],
  activo: { type: Boolean, default: true },
  imagen: { type: String },
  stockMinimoAlerta: { type: Number, required: false, min: 0 },
  stockReservado: { type: Number, default: 0 },
  proveedor: { type: Schema.Types.ObjectId, ref: 'Proveedor', required: false },
}, {
  timestamps: true,
});


productSchema.index({ nombre: 1, categoria: 1 }, { unique: true });

const Product = models.Product || model('Product', productSchema);
export default Product;