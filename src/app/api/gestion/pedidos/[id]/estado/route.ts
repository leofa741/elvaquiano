import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';

connectDB();

const CONCEPTO_MANUAL_ID = '000000000000000000000000';

export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const { estado } = await request.json();
    const { id } = await params;

    const estadosValidos = ['pendiente', 'preparacion', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const pedido = await Pedido.findById(id);
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    let mensajeExtra = '';

    // ✅ NUEVA LÓGICA: Si se cancela y el stock YA había sido descontado, lo reintegramos.
    if (estado === 'cancelado' && pedido.stockDescontado === true) {
      const operacionesReintegro = [];
      const idsProductosAfectados = new Set();

      for (const item of pedido.productos) {
        // Ignorar conceptos manuales o items sin producto vinculado
        if (!item.producto || item.producto.toString() === CONCEPTO_MANUAL_ID) continue;

        operacionesReintegro.push({
          updateOne: {
            filter: { _id: item.producto, "stock.deposito": pedido.deposito },
            update: { 
              $inc: { "stock.$.cantidad": item.cantidad } 
            }
          }
        });
        idsProductosAfectados.add(item.producto.toString());
      }

      if (operacionesReintegro.length > 0) {
        await Producto.bulkWrite(operacionesReintegro, { ordered: false });
      }

      // Marcamos que el stock ya no está descontado (fue reintegrado)
      pedido.stockDescontado = false;
      mensajeExtra = '✅ El stock de los productos ha sido reintegrado al inventario.';

      // Notificar cambios de stock
      const productosActualizados = await Producto.find({ _id: { $in: Array.from(idsProductosAfectados) } });
      productosActualizados.forEach(prod => {
        notifyProducts({
          type: 'stock_modificado',
          data: { producto: prod, motivo: 'reintegrado_por_cancelacion', pedidoId: pedido._id }
        });
      });
    }

    pedido.estado = estado;
    await pedido.save();

    notifyPedidoClients({
      type: estado === 'cancelado' ? 'pedido_cancelado' : 'pedido_estado_actualizado',
      data: pedido,
    });

    // Devolvemos el mensaje extra si hubo reintegro
    return NextResponse.json({ ...pedido.toObject(), message: mensajeExtra }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}