import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';
import { notifyProducts } from '../../../productos/events/productsNotifier';

connectDB();

async function procesarStockFisico(
  pedido: any,
  accion: 'descontar' | 'devolver',
  motivoNotificacion: string
): Promise<{ advertencias: string[]; yaProcesado: boolean }> {
  const advertencias: string[] = [];

  // 🔒 BLOQUEO: Si ya se descontó y queremos descontar de nuevo, ignorar
  if (accion === 'descontar' && pedido.stockDescontado === true) {
    return { advertencias: [], yaProcesado: true };
  }
  
  // 🔒 BLOQUEO: Si NUNCA se descontó y queremos devolver, ignorar
  if (accion === 'devolver' && pedido.stockDescontado !== true) {
    return { advertencias: [], yaProcesado: true };
  }

  const operaciones: any[] = [];
  const idsProductosAfectados = new Set();

  for (const item of pedido.productos) {
    if (!item.producto) continue;

    if (accion === 'descontar') {
      const producto = await Producto.findById(item.producto);
      if (producto) {
        const stockInfo = producto.stock.find((s: any) => s.deposito === pedido.deposito);
        if (stockInfo && stockInfo.cantidad < item.cantidad) {
          advertencias.push(`Stock insuficiente para "${item.nombre}" en ${pedido.deposito}.`);
        }
      }
    }

    operaciones.push({
      updateOne: {
        filter: { _id: item.producto, "stock.deposito": pedido.deposito },
        update: {
          $inc: { "stock.$.cantidad": accion === 'descontar' ? -item.cantidad : item.cantidad }
        }
      }
    });
    idsProductosAfectados.add(item.producto.toString());
  }

  if (operaciones.length > 0) {
    await Producto.bulkWrite(operaciones, { ordered: false });
  }

  await Pedido.findByIdAndUpdate(pedido._id, {
    stockDescontado: accion === 'descontar' ? true : false
  });

  const productosActualizados = await Producto.find({ _id: { $in: Array.from(idsProductosAfectados) } });
  productosActualizados.forEach(prod => {
    notifyProducts({ type: 'stock_modificado', data: { producto: prod, motivo: motivoNotificacion, pedidoId: pedido._id } });
  });

  return { advertencias, yaProcesado: false };
}

export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const { estado } = await request.json();
    const { id } = params;

    // ✅ SOLO 3 ESTADOS VÁLIDOS
    const estadosValidos = ['pendiente', 'preparacion', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const pedido = await Pedido.findById(id);
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    const estadoAnterior = pedido.estado;
    let resultadoStock = { advertencias: [] as string[], yaProcesado: false };

    // 1. pendiente → preparacion (Descontar stock)
    if (estadoAnterior === 'pendiente' && estado === 'preparacion') {
      resultadoStock = await procesarStockFisico(pedido, 'descontar', 'pedido_en_preparacion');
    }

    // 2. preparacion → pendiente (Devolver stock)
    if (estadoAnterior === 'preparacion' && estado === 'pendiente') {
      resultadoStock = await procesarStockFisico(pedido, 'devolver', 'correccion_a_pendiente');
    }

    // 3. preparacion → cancelado (Devolver stock)
    if (estadoAnterior === 'preparacion' && estado === 'cancelado') {
      resultadoStock = await procesarStockFisico(pedido, 'devolver', 'pedido_cancelado');
    }
    
    // Nota: pendiente → cancelado NO toca el stock porque stockDescontado ya es false.

    pedido.estado = estado;
    await pedido.save();

    notifyPedidoClients({
      type: estado === 'cancelado' ? 'pedido_cancelado' : 'pedido_estado_actualizado',
      data: pedido,
    });

    if (resultadoStock.yaProcesado) {
      return NextResponse.json({ ...pedido.toObject(), warning: '⚠️ Operación ya procesada previamente.' }, { status: 200 });
    }

    if (resultadoStock.advertencias.length > 0) {
      return NextResponse.json({ ...pedido.toObject(), warning: resultadoStock.advertencias.join(' | ') }, { status: 200 });
    }

    return NextResponse.json(pedido, { status: 200 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}