// src/app/lib/mongoose.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_CNN!;

if (!MONGODB_URI) {
  throw new Error('La variable MONGODB_CNN no está definida');
}

// Cache global (clave para Vercel)
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export default async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
