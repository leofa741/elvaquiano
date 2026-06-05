import mongoose, { Schema, models } from 'mongoose';

const LogStockSchema = new Schema({
  usuario: { 
    type: String, 
    required: true 
  },
  productoId: { 
    type: String, 
    required: true 
  },
  productoNombre: { 
    type: String, 
    required: true 
  },
  stockAnterior: [{
    deposito: { type: String, required: true },
    cantidad: { type: Number, required: true }
  }],
  stockNuevo: [{
    deposito: { type: String, required: true },
    cantidad: { type: Number, required: true }
  }],
  stockTotalAnterior: { 
    type: Number, 
    required: true 
  },
  stockTotalNuevo: { 
    type: Number, 
    required: true 
  },
  accion: { 
    type: String, 
    required: true,
    enum: ['resetear_cero', 'cantidad_personalizada', 'edicion_manual', 'otro']
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

const LogStockModel = models.LogStock || mongoose.model('LogStock', LogStockSchema);

export default LogStockModel;