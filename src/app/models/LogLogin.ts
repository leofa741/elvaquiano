
import mongoose, { Schema, models } from 'mongoose';

const LogSchema = new Schema({
  email: { type: String, required: true },
  provider: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const LogModel = models.LogLogin || mongoose.model('LogLogin', LogSchema);

export default LogModel;
