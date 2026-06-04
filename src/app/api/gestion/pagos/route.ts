// app/api/gestion/pagos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Pago from '@/app/models/Pago';
import Pedido from '@/app/models/Pedido';
import Cliente from '@/app/models/Cliente';
import CuentaCorriente from '@/app/models/CuentaCorriente';

// Registrar modelos (evita errores de populate)
(() => {
  void Cliente.modelName;
  void Pedido.modelName;
  void Pago.modelName;
  void CuentaCorriente.modelName;
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

    // ✅ PASO 1: Crear el registro del pago
    const pago = new Pago({
      cliente: clienteId,
      pedido: pedidoId,
      monto,
      formaPago,
      referencia,
      notas
    });

    const pagoGuardado = await pago.save();

    // ✅ PASO 2: Crear movimiento en CuentaCorriente para actualizar el saldo del cliente
    await crearMovimientoCuentaCorriente(
      clienteId,
      pedidoId,
      monto,
      formaPago,
      pagoGuardado._id.toString(),
      notas
    );

    // ✅ PASO 3: Actualizar estado del pedido
    await actualizarEstadoPagoPorPedido(pedidoId);

    return NextResponse.json(pagoGuardado, { status: 201 });

  } catch (error: any) {
    console.error('Error al registrar pago:', error);
    return NextResponse.json({ error: 'Error al registrar el pago.' }, { status: 500 });
  }
}

// ✅ NUEVA FUNCIÓN: Crear movimiento en CuentaCorriente
async function crearMovimientoCuentaCorriente(
  clienteId: string,
  pedidoId: string,
  monto: number,
  formaPago: string,
  pagoId: string,
  notas?: string
) {
  try {
    // ✅ Verificar si ya existe un movimiento con este pagoId (evita duplicados)
    const yaExiste = await CuentaCorriente.findOne({ 
      referenciaId: pagoId,
      tipo: 'pago'
    });
    
    if (yaExiste) {
      console.log('⚠️ Movimiento ya existe para este pago:', pagoId);
      return;
    }

    // Obtener el último movimiento para calcular el saldo anterior
    const ultimoMovimiento = await CuentaCorriente.findOne({ cliente: clienteId })
      .sort({ createdAt: -1, _id: -1 })
      .lean() as any;

    const saldoAnterior = ultimoMovimiento ? (ultimoMovimiento.saldoActual || 0) : 0;
    const saldoActual = saldoAnterior - monto; // Restamos porque es un pago

    // Crear el movimiento
    await CuentaCorriente.create({
      cliente: clienteId,
      pedido: pedidoId,
      tipo: 'pago',
      referenciaId: pagoId, // ✅ Usamos el ID del pago como referencia única
      descripcion: `Pago recibido - ${formaPago}`,
      importe: monto,
      saldoAnterior,
      saldoActual,
      formaPago: formaPago,
      notas: notas || 'Pago desde detalle de pedido'
    });

    console.log('✅ Movimiento en CuentaCorriente creado:', {
      clienteId,
      pedidoId,
      monto,
      saldoAnterior,
      saldoActual,
      pagoId
    });

  } catch (error: any) {
    console.error('❌ Error al crear movimiento en CuentaCorriente:', error);
    // No lanzamos error para que el pago se registre aunque falle el movimiento
  }
}

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
async function actualizarEstadoPagoPorPedido(pedidoId: string) {
  const pedido = await Pedido.findById(pedidoId);
  if (!pedido) return;

  const pagos = await Pago.find({ pedido: pedidoId });
  const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);

  if (totalPagado >= pedido.total) {
    pedido.estadoPago = 'pagado';
  } else if (totalPagado > 0) {
    pedido.estadoPago = 'parcial';
  } else {
    pedido.estadoPago = 'pendiente';
  }

  await pedido.save();
}