import { NextRequest, NextResponse } from 'next/server';
import Presupuesto from '@/app/models/Presupuesto'; // ⚠️ Verifica esta ruta
import connectDB from '@/app/lib/mongoose';


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; idx: string }> } // ✅ params es Promesa con 2 valores
) {
  try {
    await connectDB();
    const { id, idx } = await params; // ✅ Await de params
    const body = await req.json();
    const { nuevaCantidad, nuevoPrecio } = body;
    
    const index = parseInt(idx);

    const presupuesto = await Presupuesto.findById(id);
    if (!presupuesto) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });

    if (index < 0 || index >= presupuesto.productos.length) {
      return NextResponse.json({ error: 'Índice de producto inválido' }, { status: 400 });
    }

    presupuesto.productos[index].cantidad = nuevaCantidad;
    presupuesto.productos[index].precioAplicado = nuevoPrecio;
    presupuesto.productos[index].subtotal = nuevaCantidad * nuevoPrecio;

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
  { params }: { params: Promise<{ id: string; idx: string }> } // ✅ Next.js 15: params es una Promesa
) {
  try {
    await connectDB();
    
    // ✅ Esperamos a que se resuelva la promesa de params
    const { id, idx } = await params; 
    const index = parseInt(idx);

    const presupuesto = await Presupuesto.findById(id);
    if (!presupuesto) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
    }

    if (index < 0 || index >= presupuesto.productos.length) {
      return NextResponse.json({ error: 'Índice de producto inválido' }, { status: 400 });
    }

    // 1. Elimina el producto del array en la posición 'index'
    presupuesto.productos.splice(index, 1);

    // 2. Recalcular el total del presupuesto
    presupuesto.total = presupuesto.productos.reduce((acc: number, p: any) => acc + p.subtotal, 0);
    
    // 3. Guardar los cambios
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