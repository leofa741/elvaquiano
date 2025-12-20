// app/api/gestion/pagos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Pago from '@/app/models/Pago';
import Pedido from '@/app/models/Pedido';
import Cliente from '@/app/models/Cliente';

// Registrar modelos (evita errores de populate)
(() => {
  void Cliente.modelName;
  void Pedido.modelName;
  void Pago.modelName;
})();

connectDB();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clienteId, pedidoId, monto, formaPago, referencia, notas } = body;

    if (!clienteId || !pedidoId || !monto || !formaPago) {
      return NextResponse.json(
        { error: 'Cliente, pedido, monto y forma de pago son obligatorios.' },
        { status: 400 }
      );
    }

    // Validar que el pedido exista y pertenezca al cliente
    const pedido = await Pedido.findById(pedidoId);
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
    }
    if (pedido.cliente.toString() !== clienteId) {
      return NextResponse.json({ error: 'El pedido no pertenece al cliente.' }, { status: 400 });
    }

    const pago = new Pago({
      cliente: clienteId,
      pedido: pedidoId,
      monto,
      formaPago,
      referencia,
      notas
    });

    const pagoGuardado = await pago.save();

    // Opcional: actualizar estado del pedido (abajo te explico cómo)
    await actualizarEstadoPedidoPorPago(pedidoId);

    return NextResponse.json(pagoGuardado, { status: 201 });

  } catch (error: any) {
    console.error('Error al registrar pago:', error);
    return NextResponse.json({ error: 'Error al registrar el pago.' }, { status: 500 });
  }
}

// app/api/gestion/pagos/route.ts 

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pedidoId = searchParams.get('pedidoId');

    await connectDB();

    let query = {};
    if (pedidoId) {
      if (!/^[0-9a-fA-F]{24}$/.test(pedidoId)) {
        return NextResponse.json({ error: 'ID de pedido inválido.' }, { status: 400 });
      }
      query = { pedido: pedidoId };
    }

    const pagos = await Pago.find(query)
      .populate('cliente', 'razonSocial nombre apellido')
      .populate('pedido', 'total')
      .sort({ createdAt: -1 });

    return NextResponse.json(pagos, { status: 200 });

  } catch (error: any) {
    console.error('Error al listar pagos:', error);
    return NextResponse.json({ error: 'Error al cargar los pagos.' }, { status: 500 });
  }
}

// Función auxiliar: recalcula el estado del pedido según los pagos
async function actualizarEstadoPedidoPorPago(pedidoId: string) {
  const pagos = await Pago.find({ pedido: pedidoId });
  const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
  const pedido = await Pedido.findById(pedidoId);
  if (!pedido) return;

  if (totalPagado >= pedido.total) {
    pedido.estado = 'entregado'; // o 'pagado', según tu lógica
  } else if (totalPagado > 0) {
    pedido.estado = 'preparacion'; // o un nuevo estado como 'parcial'
  }
  // Si totalPagado === 0, queda 'pendiente'

  await pedido.save();
}