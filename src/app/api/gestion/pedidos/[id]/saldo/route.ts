// app/api/gestion/pedidos/[id]/saldo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Pedido from '@/app/models/Pedido';
import Pago from '@/app/models/Pago';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 👈 CORREGIDO: Promise<{ id: string }>
) {
  try {
    await connectDB();
    const { id: pedidoId } = await params; // 👈 CORREGIDO: await params


    const pedido = await Pedido.findById(pedidoId);
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const pagos = await Pago.find({ pedido: pedidoId });
    const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
    const saldoPendiente = pedido.total - totalPagado;

    return NextResponse.json({
      total: pedido.total,
      totalPagado,
      saldoPendiente,
      estadoPago: saldoPendiente <= 0 ? 'pagado' :
        totalPagado > 0 ? 'parcial' : 'pendiente',
      pagos: pagos.map(p => ({
        _id: p._id,
        monto: p.monto,
        formaPago: p.formaPago,
        fechaPago: p.fechaPago,
        referencia: p.referencia,
        notas: p.notas,
        createdAt: p.createdAt
      }))
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error al obtener saldo:', error);
    return NextResponse.json({ error: 'Error al calcular saldo' }, { status: 500 });
  }
}