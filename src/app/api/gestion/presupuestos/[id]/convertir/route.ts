import { NextRequest, NextResponse } from 'next/server';

import connectDB from '@/app/lib/mongoose';
import Pedido from '@/app/models/Pedido';
import Presupuesto from '@/app/models/Presupuesto';

export async function POST(request: NextRequest, { params }: any) {
  try {
    const { id } = params;

    await connectDB();

    const presupuesto = await Presupuesto.findById(id);
    if (!presupuesto) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
    }

    if (presupuesto.estado === 'convertido') {
      return NextResponse.json({ error: 'Este presupuesto ya fue convertido' }, { status: 400 });
    }

    const nuevoPedido = new Pedido({
      cliente: presupuesto.cliente,
      productos: presupuesto.productos.map((p: any) => ({
        producto: p.producto,
        nombre: p.nombre,
        unidad: p.unidad,
        deposito: p.deposito,
        cantidad: p.cantidad,
        tipoPrecio: p.tipoPrecio,
        precioAplicado: p.precioAplicado,
        subtotal: p.subtotal
      })),
      deposito: presupuesto.productos[0]?.deposito || 'principal',
      total: presupuesto.total,
      estado: 'pendiente'
    });

    const pedidoGuardado = await nuevoPedido.save();

    presupuesto.pedidoAsociado = pedidoGuardado._id;
    presupuesto.estado = 'convertido';
    await presupuesto.save();

    return NextResponse.json(
      { message: 'Presupuesto convertido en pedido', pedidoId: pedidoGuardado._id.toString() },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error al convertir presupuesto:', error);
    return NextResponse.json({ error: 'Error al convertir el presupuesto' }, { status: 500 });
  }
}
