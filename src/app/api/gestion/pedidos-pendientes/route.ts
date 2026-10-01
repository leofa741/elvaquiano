// app/api/gestion/pedidos-pendientes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Pedido from '@/app/models/Pedido';
import Pago from '@/app/models/Pago';
import CuentaCorriente from '@/app/models/CuentaCorriente';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get('clienteId');

    if (!clienteId) {
      return NextResponse.json({ error: 'clienteId es requerido' }, { status: 400 });
    }

    // 1. Buscar pedidos que tengan deuda (pendientes o parciales)
    const pedidos = await Pedido.find({
      cliente: new mongoose.Types.ObjectId(clienteId),
      estadoPago: { $in: ['pendiente', 'parcial'] },
      activo: { $ne: false },
      estado: { $ne: 'cancelado' }
    }).sort({ createdAt: -1 }).lean() as any[];

    // 2. Calcular la deuda real de cada pedido
    const pedidosConDeuda = await Promise.all(pedidos.map(async (p) => {
      const pagosEnPago = await Pago.find({ pedido: p._id }).select('monto').lean();
      const pagosEnCC = await CuentaCorriente.find({ 
        cliente: new mongoose.Types.ObjectId(clienteId), 
        pedido: p._id, 
        tipo: 'pago' 
      }).select('importe').lean();

      const totalPagado = [
        ...pagosEnPago.map(x => Number(x.monto) || 0), 
        ...pagosEnCC.map(x => Number(x.importe) || 0)
      ].reduce((sum, val) => sum + val, 0);

      const saldoPendiente = Math.max(0, Number(p.total) - totalPagado);

      return {
        _id: p._id,
        numero: p.numero || `PED-${p._id.toString().slice(-6)}`, // Fallback si no hay campo numero
        fecha: p.createdAt,
        total: Number(p.total),
        estadoPago: p.estadoPago,
        saldoPendiente
      };
    }));

    return NextResponse.json({ pedidos: pedidosConDeuda }, { status: 200 });
  } catch (error: any) {
    console.error('Error al obtener pedidos pendientes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}