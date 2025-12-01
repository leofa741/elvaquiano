// lib/mongoose.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';


dotenv.config();

const connectDB = async () => {
    try {
     
        if (!process.env.MONGODB_CNN) {
          throw new Error('La variable de entorno MONGODB_CNN no está definida');
        }
        await mongoose.connect(process.env.MONGODB_CNN);
        console.log('MongoDB conectado');
      } catch (error) {
        console.error('Error al conectar MongoDB:', error);
        process.exit(1);
      }
      
};

export default connectDB;