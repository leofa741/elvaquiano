// app/api/gestion/categorias/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/app/models/Product';

export async function GET() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Obtener categorías únicas de productos activos
    const categorias = await Product.distinct('categoria', { activo: true });
    return NextResponse.json(categorias.sort());
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return NextResponse.json([], { status: 500 });
  }
}