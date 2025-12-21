// app/api/gestion/depositos/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/app/models/Product'; // Ajusta la ruta si tu archivo está en otro lado
import connectDB from '@/app/lib/mongoose';



connectDB();

export async function GET() {
  try {

 

    // Obtener todos los productos y sus stocks
    const products = await Product.find(
      { activo: true },
      { stock: 1, _id: 0 }
    ).lean();

    // Extraer todos los nombres de depósitos
    const depositosSet = new Set<string>();
    for (const product of products) {
      if (product.stock && Array.isArray(product.stock)) {
        for (const item of product.stock) {
          if (item.deposito && typeof item.deposito === 'string') {
            depositosSet.add(item.deposito.trim());
          }
        }
      }
    }

    const depositos = Array.from(depositosSet).sort();

    return NextResponse.json(depositos);
  } catch (error) {
    console.error('Error al obtener depósitos:', error);
    return NextResponse.json(
      { error: 'Error al cargar depósitos' },
      { status: 500 }
    );
  }
}