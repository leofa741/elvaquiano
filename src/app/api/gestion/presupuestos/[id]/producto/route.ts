import { NextRequest, NextResponse } from 'next/server';
import Presupuesto from '@/app/models/Presupuesto'; 
import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params; 
    const body = await req.json();
    const { productoId, cantidad, precioPersonalizado } = body;

    const presupuesto = await Presupuesto.findById(id);
    if (!presupuesto) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });

    const productoBase = await Product.findById(productoId);
    if (!productoBase) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

    const subtotal = cantidad * precioPersonalizado;

    // ✅ AGREGAMOS 'tipoPrecio' y 'deposito' para cumplir con la validación de Mongoose
    presupuesto.productos.push({
      producto: productoId,
      nombre: productoBase.nombre,
      unidad: productoBase.unidad,
      cantidad,
      precioAplicado: precioPersonalizado,
      subtotal,
      tipoPrecio: productoBase.tipoPrecio || 'mayorista',       // ✅ Campo requerido
      deposito: presupuesto.deposito || 'Principal'             // ✅ Campo requerido
    });

    // Recalcular total
    presupuesto.total = presupuesto.productos.reduce((acc: number, p: any) => acc + p.subtotal, 0);
    
    // Guardamos con validateBeforeSave: true (por defecto) para asegurar que todo esté bien
    await presupuesto.save();

    return NextResponse.json(presupuesto);
  } catch (error) {
    console.error('Error en POST producto:', error);
    return NextResponse.json({ error: 'Error al agregar producto' }, { status: 500 });
  }
}