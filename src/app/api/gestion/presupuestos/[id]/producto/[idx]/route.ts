import { NextRequest, NextResponse } from 'next/server';
import Presupuesto from '@/app/models/Presupuesto'; 
import connectDB from '@/app/lib/mongoose';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; idx: string }> }
) {
  try {
    await connectDB();
    const { id, idx } = await params;
    const body = await req.json();
    
    // 🆕 Agregamos nuevoPesoAproximado aquí
    const { nuevaCantidad, nuevoPrecio, nuevoPesoAproximado } = body;
    
    const index = parseInt(idx);

    const presupuesto = await Presupuesto.findById(id);
    if (!presupuesto) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });

    if (index < 0 || index >= presupuesto.productos.length) {
      return NextResponse.json({ error: 'Índice de producto inválido' }, { status: 400 });
    }

    presupuesto.productos[index].cantidad = nuevaCantidad;
    presupuesto.productos[index].precioAplicado = nuevoPrecio;
    presupuesto.productos[index].subtotal = nuevaCantidad * nuevoPrecio;

    // 🆕 Actualizar el peso aproximado si el frontend lo envió
    if (nuevoPesoAproximado !== undefined) {
      presupuesto.productos[index].pesoAproximado = nuevoPesoAproximado;
    }

    // Recalcular total
    presupuesto.total = presupuesto.productos.reduce((acc: number, p: any) => acc + p.subtotal, 0);
    await presupuesto.save();

    return NextResponse.json(presupuesto);
  } catch (error) {
    console.error('Error en PATCH producto:', error);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; idx: string }> }
) {
  try {
    await connectDB();
    const { id, idx } = await params; 
    const index = parseInt(idx);

    const presupuesto = await Presupuesto.findById(id);
    if (!presupuesto) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
    }

    if (index < 0 || index >= presupuesto.productos.length) {
      return NextResponse.json({ error: 'Índice de producto inválido' }, { status: 400 });
    }

    presupuesto.productos.splice(index, 1);
    presupuesto.total = presupuesto.productos.reduce((acc: number, p: any) => acc + p.subtotal, 0);
    
    await presupuesto.save();

    return NextResponse.json({ 
      message: 'Producto eliminado correctamente',
      presupuesto 
    });
  } catch (error) {
    console.error('Error en DELETE producto:', error);
    return NextResponse.json({ error: 'Error interno al eliminar el producto' }, { status: 500 });
  }
}