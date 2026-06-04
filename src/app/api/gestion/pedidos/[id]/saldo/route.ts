// API ruta para obtener el saldo pendiente de un pedido
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import CuentaCorriente from '@/app/models/CuentaCorriente';
import Pago from '@/app/models/Pago';
import Pedido from '@/app/models/Pedido';
import mongoose from 'mongoose';

const CONCEPTO_MANUAL_ID = '000000000000000000000000';

export async function GET(req: NextRequest, { params }: any) {
  try {
    await connectDB();
    const { id } = await params;

    // ✅ Obtener datos del pedido
    const pedidoData = await Pedido.findById(id).lean() as any;
    if (!pedidoData) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // ✅ Calcular total de productos reales (sin conceptos de pago)
    let totalProductosReales = 0;
    let totalConceptosPago = 0;
    
    if (pedidoData.productos && Array.isArray(pedidoData.productos)) {
      for (const producto of pedidoData.productos) {
        const subtotal = Number(producto.subtotal) || 0;
        const esConceptoPago = producto.producto?.toString() === CONCEPTO_MANUAL_ID && 
                               producto.nombre?.startsWith('💰 PAGO');
        
        if (esConceptoPago) {
          totalConceptosPago += subtotal;
        } else {
          totalProductosReales += subtotal;
        }
      }
    }

    const totalPedidoCompleto = Number(pedidoData.total) || 0;

    // ✅ Buscar pagos registrados en la tabla Pago
    const pagosDirectos = await Pago.find({
      pedido: new mongoose.Types.ObjectId(id)
    }).sort({ fechaPago: 1 }).lean() as any[];

    const totalPagadoDirecto = pagosDirectos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

    // ✅ Buscar movimientos de cuenta corriente vinculados al pedido
    const movimientosCC = await CuentaCorriente.find({
      pedido: new mongoose.Types.ObjectId(id),
      tipo: 'pago'
    }).sort({ createdAt: 1 }).lean() as any[];

    const totalPagadoCC = movimientosCC.reduce((sum, mov) => sum + (Number(mov.importe) || 0), 0);

    // ✅ CORRECCIÓN CLAVE: Usar Math.max para evitar duplicados
    // Como el mismo pago se registra en AMBAS tablas (Pago y CuentaCorriente),
    // tomamos el mayor valor en lugar de sumar ambos
    const totalPagado = Math.max(totalPagadoDirecto, totalPagadoCC);
    
    // ✅ SALDO PENDIENTE = Total completo del pedido - Total pagado
    const saldoPendiente = Math.max(0, totalPedidoCompleto - totalPagado);

    console.log('📊 [Saldo del pedido]', {
      pedidoId: id,
      totalPedidoCompleto,
      totalPagadoDirecto,
      totalPagadoCC,
      totalPagadoFinal: totalPagado,
      saldoPendiente
    });

    return NextResponse.json({ 
      saldoPendiente, 
      totalPagado, 
      totalPedido: totalProductosReales,
      totalPedidoCompleto,
      totalConceptosPago,
      totalPagadoDirecto,
      totalPagadoCC,
      movimientos: movimientosCC,
      pagos: pagosDirectos
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en GET saldo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}