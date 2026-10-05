import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';
import { notifyProducts } from '../../../productos/events/productsNotifier';

connectDB();

/* =====================================
   STOCK FÍSICO OPTIMIZADO Y SEGURO
   ✅ 1. bulkWrite: 1 sola petición a Mongo para los 30 productos
   ✅ 2. Flag de seguridad: Nunca descuenta dos veces el mismo pedido
===================================== */
async function procesarStockFisico(
  pedido: any,
  accion: 'descontar' | 'devolver',
  motivoNotificacion: string
): Promise<{ advertencias: string[]; yaProcesado: boolean }> {
  const advertencias: string[] = [];

  // 🔒 BLOQUEO CRÍTICO: Verificar si ya se procesó el stock para este pedido
  // Si el pedido ya tiene la marca "stockDescontado" y queremos descontar de nuevo → SALIR
  if (accion === 'descontar' && pedido.stockDescontado === true) {
    console.log(`[STOCK] Pedido ${pedido._id} ya tenía stock descontado. Ignorando duplicado.`);
    return { advertencias: [], yaProcesado: true };
  }
  
  // Si el pedido NO tiene la marca y queremos devolver → SALIR (evita devolver doble)
  if (accion === 'devolver' && pedido.stockDescontado !== true) {
    console.log(`[STOCK] Pedido ${pedido._id} nunca tuvo stock descontado. No hay nada que devolver.`);
    return { advertencias: [], yaProcesado: true };
  }

  // ✅ OPTIMIZACIÓN: Construimos UN SOLO bulkWrite para todos los productos
  const operaciones: any[] = [];
  const idsProductosAfectados = new Set();

  for (const item of pedido.productos) {
    if (!item.producto) continue;

    // Advertencia de stock insuficiente (solo visual, no bloquea)
    if (accion === 'descontar') {
      const producto = await Producto.findById(item.producto);
      if (producto) {
        const stockInfo = producto.stock.find((s: any) => s.deposito === pedido.deposito);
        if (stockInfo && stockInfo.cantidad < item.cantidad) {
          advertencias.push(
            `Stock insuficiente para "${item.nombre}" en ${pedido.deposito}. Disponible: ${stockInfo.cantidad}, solicitado: ${item.cantidad}.`
          );
        }
      }
    }

    operaciones.push({
      updateOne: {
        filter: { _id: item.producto, "stock.deposito": pedido.deposito },
        update: {
          $inc: {
            "stock.$.cantidad": accion === 'descontar' ? -item.cantidad : item.cantidad
          }
        }
      }
    });

    idsProductosAfectados.add(item.producto.toString());
  }

  // 🚀 EJECUTAR TODAS LAS OPERACIONES EN 1 SOLA PETICIÓN
  if (operaciones.length > 0) {
    await Producto.bulkWrite(operaciones, { ordered: false });
  }

  // 🔒 ACTUALIZAR EL FLAG EN EL PEDIDO
  // Esto garantiza que si llega otro request idéntico, no se volverá a ejecutar
  await Pedido.findByIdAndUpdate(pedido._id, {
    stockDescontado: accion === 'descontar' ? true : false
  });

  // Notificar a los clientes WebSocket (productos afectados)
  const productosActualizados = await Producto.find({ _id: { $in: Array.from(idsProductosAfectados) } });
  productosActualizados.forEach(prod => {
    notifyProducts({
      type: 'stock_modificado',
      data: {
        producto: prod,
        motivo: motivoNotificacion,
        pedidoId: pedido._id,
      },
    });
  });

  return { advertencias, yaProcesado: false };
}

/* =====================================
   PATCH ESTADO PEDIDO
===================================== */
export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const { estado } = await request.json();
    const { id } = params;

    const estadosValidos = ['pendiente', 'preparacion', 'enviado', 'entregado', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const pedido = await Pedido.findById(id);
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const estadoAnterior = pedido.estado;
    let resultadoStock = { advertencias: [] as string[], yaProcesado: false };

    // 1. pendiente → preparacion (Descontar stock)
    if (estadoAnterior === 'pendiente' && estado === 'preparacion') {
      resultadoStock = await procesarStockFisico(pedido, 'descontar', 'pedido_en_preparacion');
    }
      // 1. pendiente → preparacion (Descontar stock)
    if (estadoAnterior === 'pendiente' && estado === 'enviado') {
      resultadoStock = await procesarStockFisico(pedido, 'descontar', 'pedido_en_preparacion');
    }

      // 1. pendiente → preparacion (Descontar stock)
    if (estadoAnterior === 'pendiente' && estado === 'entregado') {
      resultadoStock = await procesarStockFisico(pedido, 'descontar', 'pedido_en_preparacion');
    }

    // 2. preparacion → pendiente (Devolver stock)
    if (estadoAnterior === 'preparacion' && estado === 'pendiente') {
      resultadoStock = await procesarStockFisico(pedido, 'devolver', 'correccion_estado_a_pendiente');
    }

    // 3. enviado → pendiente (Devolver stock)
    if (estadoAnterior === 'enviado' && estado === 'pendiente') {
      resultadoStock = await procesarStockFisico(pedido, 'devolver', 'correccion_estado_a_pendiente');
    }

    // 4. entregado → pendiente (Devolver stock)
    if (estadoAnterior === 'entregado' && estado === 'pendiente') {
      resultadoStock = await procesarStockFisico(pedido, 'devolver', 'correccion_estado_a_pendiente');
    }

    // 5. preparacion/enviado/entregado → cancelado (Devolver stock)
    if (['preparacion', 'enviado', 'entregado'].includes(estadoAnterior) && estado === 'cancelado') {
      resultadoStock = await procesarStockFisico(pedido, 'devolver', 'pedido_cancelado');
    }

    pedido.estado = estado;
    await pedido.save();

    notifyPedidoClients({
      type: estado === 'cancelado' ? 'pedido_cancelado' : 'pedido_estado_actualizado',
      data: pedido,
    });

    if (resultadoStock.yaProcesado) {
      // Si ya se procesó antes, devolvemos el pedido actual sin volver a tocar stock
      return NextResponse.json({
        ...pedido.toObject(),
        warning: '⚠️ Este pedido ya había sido procesado previamente. Se evitó una operación duplicada.'
      }, { status: 200 });
    }

    if (resultadoStock.advertencias.length > 0) {
      return NextResponse.json({
        ...pedido.toObject(),
        warning: resultadoStock.advertencias.join(' | ')
      }, { status: 200 });
    }

    return NextResponse.json(pedido, { status: 200 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}