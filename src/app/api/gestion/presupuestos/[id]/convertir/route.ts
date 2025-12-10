import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Pedido from '@/app/models/Pedido';
import Presupuesto from '@/app/models/Presupuesto';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Obtener el ID desde la URL
    const id = request.nextUrl.pathname.split('/').slice(-2)[0];

    const presupuesto = await Presupuesto.findById(id);
    if (!presupuesto) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado' },
        { status: 404 }
      );
    }

    if (presupuesto.estado === 'convertido') {
      return NextResponse.json(
        { error: 'Este presupuesto ya fue convertido' },
        { status: 400 }
      );
    }

    const nuevoPedido = new Pedido({
      cliente: presupuesto.cliente,
      productos: presupuesto.productos,
      deposito: presupuesto.productos[0]?.deposito || 'principal',
      total: presupuesto.total,
      estado: 'pendiente',
    });

    const pedidoGuardado = await nuevoPedido.save();

    presupuesto.pedidoAsociado = pedidoGuardado._id;
    presupuesto.estado = 'convertido';
    await presupuesto.save();

    return NextResponse.json(
      {
        message: 'Presupuesto convertido',
        pedidoId: pedidoGuardado._id.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al convertir presupuesto:', error);
    return NextResponse.json(
      { error: 'Error al convertir el presupuesto' },
      { status: 500 }
    );
  }
}
