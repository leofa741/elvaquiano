// src/app/api/gestion/pedidos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Pedido from '@/app/models/Pedido';
import Cliente from '@/app/models/Cliente';
import Product from '@/app/models/Product';

// ✅ Aseguramos que los modelos estén registrados
(() => {
  void Cliente.modelName;
  void Product.modelName;
  void Pedido.modelName;
})();

export async function GET(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    // ✅ FIX: Await params antes de usarlo
    const { id } = await params;

    if (!id || id.length !== 24) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 });
    }

    await connectDB();

    const pedido = await Pedido.findById(id)
      .populate('cliente', 'razonSocial nombre apellido direccion telefono')
      .populate({
        path: 'productos.producto',
        model: 'Product',
        select: 'nombre'
      });

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    return NextResponse.json(pedido, { status: 200 });

  } catch (error: any) {
    console.error('Error al obtener pedido:', error);
    return NextResponse.json(
      { error: 'Error al cargar el pedido', details: error.message },
      { status: 500 }
    );
  }
}