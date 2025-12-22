import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import Pedido from '@/app/models/Pedido';
import Pago from '@/app/models/Pago';
import { Types } from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 👈 CORREGIDO: Promise<{ id: string }>
) {
  try {
    await connectDB();
    const { id } = await params; // 👈 CORREGIDO: await params


    // Validar ObjectId
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID de cliente inválido' }, { status: 400 });
    }

    // Obtener cliente
    const cliente = await Cliente.findById(id);
    if (!cliente || !cliente.activo) {
      return NextResponse.json({ error: 'Cliente no encontrado o inactivo' }, { status: 404 });
    }

    // 🔹 NUEVO: Obtener TODOS los pagos del cliente (ordenados por fecha, más recientes primero)
    const todosLosPagos = await Pago.find({ cliente: id })
      .populate('pedido', 'total createdAt')
      .sort({ fechaPago: -1 });

    // Obtener pedidos activos del cliente (no cancelados)
    const pedidos = await Pedido.find({
      cliente: id,
      activo: true,
      estado: { $ne: 'cancelado' }
    }).sort({ createdAt: 1 }); // FIFO para cálculo de deuda

    let deudaTotal = 0;
    const pedidosConDeuda = [];

    // Calcular deuda por pedido usando los pagos ya obtenidos
    for (const pedido of pedidos) {
      // Filtrar pagos de este pedido (evita múltiples queries)
      const pagosDelPedido = todosLosPagos.filter(
        (p) => p.pedido && p.pedido._id.toString() === pedido._id.toString()
      );
      const totalPagado = pagosDelPedido.reduce((sum, p) => sum + p.monto, 0);
      const saldo = pedido.total - totalPagado;

      if (saldo > 0) {
        deudaTotal += saldo;
        pedidosConDeuda.push({
          _id: pedido._id,
          total: pedido.total,
          createdAt: pedido.createdAt,
          estado: pedido.estado,
          estadoPago: pedido.estadoPago,
          saldo: parseFloat(saldo.toFixed(2))
        });
      }
    }

    // 🔹 NUEVO: Formatear historial de pagos para el frontend
    const historialPagos = todosLosPagos.map((p) => ({
      _id: p._id,
      monto: p.monto,
      formaPago: p.formaPago,
      fechaPago: p.fechaPago,
      referencia: p.referencia || undefined,
      notas: p.notas || undefined,
      pedidoId: p.pedido?._id?.toString() || null,
      pedidoTotal: p.pedido?.total || null,
    }));

    // Datos del cliente (solo lo necesario)
    const clienteInfo = {
      _id: cliente._id,
      razonSocial: cliente.razonSocial,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      telefono: cliente.telefono,
      email: cliente.email,
      formaPago: cliente.formaPago
    };

    return NextResponse.json({
      cliente: clienteInfo,
      deudaTotal: parseFloat(deudaTotal.toFixed(2)),
      pedidosConDeuda,
      historialPagos // 👈 ¡Incluido!
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error al cargar finanzas del cliente:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}