// /api/gestion/productos/search/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();

    // UX: evita búsquedas basura
    if (!q || q.length < 2) {
      return NextResponse.json({
        products: [],
        hint: 'Ingresá al menos 2 caracteres para buscar',
      });
    }

    // Normalizar texto (espacios múltiples)
    const normalized = q.replace(/\s+/g, ' ');

    // ✅ CORREGIDO: Eliminar filtro activo: true para mostrar TODOS los productos
    const products = await Product.find({
      // activo: true, ← ❌ ELIMINAR esta línea
      $or: [
        { nombre: { $regex: normalized, $options: 'i' } },
        { categoria: { $regex: normalized, $options: 'i' } },
        { unidad: { $regex: normalized, $options: 'i' } },
      ],
    })
      .limit(50)          // protege performance
      .lean();            // más rápido

    return NextResponse.json({
      products,
      total: products.length,
    });
  } catch (error) {
    console.error('Error búsqueda productos:', error);
    return NextResponse.json(
      { error: 'Error interno en búsqueda' },
      { status: 500 }
    );
  }
}