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
    
    // 🆕 Agregamos pesoAproximado aquí
    const { productoId, cantidad, precioPersonalizado, pesoAproximado } = body;

    const presupuesto = await Presupuesto.findById(id);
    if (!presupuesto) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });

    const productoBase = await Product.findById(productoId);
    if (!productoBase) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

    const subtotal = cantidad * precioPersonalizado;

    presupuesto.productos.push({
      producto: productoId,
      nombre: productoBase.nombre,
      unidad: productoBase.unidad,
      categoria: productoBase.categoria, // 🆕 NUEVO: Guardamos la categoría (ej: "fiambres")
      pesoAproximado: pesoAproximado !== undefined ? pesoAproximado : null, // 🆕 NUEVO: Guardamos el peso si se envió
      cantidad,
      precioAplicado: precioPersonalizado,
      subtotal,
      tipoPrecio: productoBase.tipoPrecio || 'mayorista',
      deposito: presupuesto.deposito || 'Principal'
    });

    // Recalcular total
    presupuesto.total = presupuesto.productos.reduce((acc: number, p: any) => acc + p.subtotal, 0);
    
    await presupuesto.save();

    return NextResponse.json(presupuesto);
  } catch (error) {
    console.error('Error en POST producto:', error);
    return NextResponse.json({ error: 'Error al agregar producto' }, { status: 500 });
  }
}