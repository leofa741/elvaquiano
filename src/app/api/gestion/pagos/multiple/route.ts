// src/app/api/gestion/pagos/multiple/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Pago from '@/app/models/Pago';
import Pedido from '@/app/models/Pedido';
import Cliente from '@/app/models/Cliente';

// ✅ Aseguramos que los modelos estén registrados
(() => {
    void Cliente.modelName;
    void Pedido.modelName;
    void Pago.modelName;
})();

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    const { clienteId, montoTotal, formaPago, referencia, notas } = body;

    // 1. Validaciones básicas
    if (!clienteId || !montoTotal || !formaPago) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }
    if (montoTotal <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
    }

    // 2. Obtener pedidos pendientes del cliente, ordenados por fecha (FIFO)
    const pedidosPendientes = await Pedido.find({
      cliente: clienteId,
      activo: true,
      estado: { $ne: 'cancelado' }
    }).sort({ createdAt: 1 });

    // 3. Calcular saldos reales
    let deudaTotal = 0;
    const pedidosConSaldo = [];

    for (const p of pedidosPendientes) {
      const pagos = await Pago.find({ pedido: p._id });
      const totalPagado = pagos.reduce((sum, pg) => sum + pg.monto, 0);
      const saldo = p.total - totalPagado;
      if (saldo > 0) {
        deudaTotal += saldo;
        pedidosConSaldo.push({
          _id: p._id,
          total: p.total,
          saldo,
          createdAt: p.createdAt
        });
      }
    }

    if (deudaTotal === 0) {
      return NextResponse.json({ error: 'El cliente no tiene deuda pendiente' }, { status: 400 });
    }

    // ✅ 4. Validación: el monto no puede superar la deuda total
    if (montoTotal > deudaTotal) {
      return NextResponse.json({ 
        error: `El monto no puede superar la deuda total ($${deudaTotal.toFixed(2)})` 
      }, { status: 400 });
    }

    // 🔹 5. Lógica de distribución FIFO
    let montoRestante = montoTotal;
    const pagosACrear = [];

    for (const p of pedidosConSaldo) {
      if (montoRestante <= 0) break;
      const montoAplicar = Math.min(montoRestante, p.saldo);
      pagosACrear.push({
        pedidoId: p._id,
        monto: parseFloat(montoAplicar.toFixed(2))
      });
      montoRestante -= montoAplicar;
    }

    // 6. Crear los pagos
    const pagosCreados = [];
    for (const item of pagosACrear) {
      const pago = new Pago({
        cliente: clienteId,
        pedido: item.pedidoId,
        monto: item.monto,
        formaPago,
        referencia,
        notas: notas || `Pago múltiple: $${montoTotal.toFixed(2)}`
      });
      const guardado = await pago.save();
      pagosCreados.push(guardado);
      await actualizarEstadoPago(item.pedidoId);
    }

    return NextResponse.json({ 
      success: true,
      pagos: pagosCreados.length,
      mensaje: `Se registraron ${pagosCreados.length} pagos`
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error en pago múltiple:', error);
    return NextResponse.json({ error: 'Error al procesar el pago' }, { status: 500 });
  }
}

async function actualizarEstadoPago(pedidoId: string) {
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