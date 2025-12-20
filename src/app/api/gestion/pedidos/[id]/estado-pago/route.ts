// app/api/gestion/pedidos/[id]/estado-pago/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Pedido from '@/app/models/Pedido';

connectDB();

export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const { id } = params;
    const { estadoPago } = await request.json();

    const estadosValidos = ['pendiente', 'parcial', 'pagado'];
    if (!estadosValidos.includes(estadoPago)) {
      return NextResponse.json({ error: 'Estado de pago inválido' }, { status: 400 });
    }

    const pedido = await Pedido.findById(id);
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Nota: podrías validar que 'pagado' solo se permita si totalPagado >= total
    // pero si usás el modelo Pago, mejor calcularlo dinámicamente (abajo)

    pedido.estadoPago = estadoPago;
    await pedido.save();

    return NextResponse.json(pedido, { status: 200 });

  } catch (error: any) {
    console.error('Error al actualizar estado de pago:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}