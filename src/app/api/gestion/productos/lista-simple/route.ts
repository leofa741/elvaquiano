// app/api/gestion/productos/lista-simple/route.ts
import { NextResponse } from 'next/server';
import Product from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';

connectDB();

export async function GET() {
  try {
    const productos = await Product.find(
      { activo: true },
      { 
        _id: 1, 
        nombre: 1, 
        unidad: 1,       
        precioMayorista: 1,   // ✅ Campo real del modelo
        precioOferta: 1,    // ✅ Campo real del modelo
      }
    ).sort({ nombre: 1 });

    // Formatear para que el frontend reciba la estructura esperada
    const productosFormateados = productos.map(p => ({
      _id: p._id.toString(),
      nombre: p.nombre,
      unidad: p.unidad,
      precio: {
        oferta: p.precioOferta || null,
        mayorista: p.precioMayorista || 0
      }
    }));

    return NextResponse.json(productosFormateados, { status: 200 });
  } catch (error: any) {
    console.error('Error lista-simple:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}