import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongoose';
import Product from "@/app/models/Product";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');

    if (!query) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }

    // Si es un ObjectId → buscar por ID
    if (mongoose.Types.ObjectId.isValid(query)) { 
      const product = await Product.findById(query);
      return NextResponse.json({ products: product ? [product] : [] }, { status: 200 });
    }

    // Búsqueda normal
    const regex = new RegExp(query, 'i');
    const filter = {
       activo: true, 
      $or: [
        { nombre: regex },
        { categoria: regex }
      ]
    };

    const products = await Product.find(filter);
    return NextResponse.json({ products }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ products: [] }, { status: 200 });
  }
}
