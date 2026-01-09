import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';
import { notifyProducts } from '../../../productos/events/productsNotifier';

connectDB();

/**
 * 🔹 Función para procesar stock reservado
 * Solo afecta stockReservado si es online
 */
async function procesarStockReservado(pedido: any, accion: 'liberar' | 'descontar') {
  if (pedido.origen !== 'online') return; // solo online

  for (const item of pedido.productos) {
    const producto = await Producto.findById(item.producto);
    if (!producto) continue;

    if (accion === 'liberar') {
      producto.stockReservado = Math.max(0, (producto.stockReservado || 0) - item.cantidad);
    } else if (accion === 'descontar') {
      producto.stockReservado = Math.max(0, (producto.stockReservado || 0) + item.cantidad);
    }

    await producto.save();

    notifyProducts({
      type: 'stock_reservado',
      data: producto,
    });
  }
}

/**
 * 🔹 Función para descontar o devolver stock físico (real)
 */
async function procesarStockFisico(pedido: any, accion: 'descontar' | 'devolver') {
  for (const item of pedido.productos) {
    const producto = await Producto.findById(item.producto);
    if (!producto) continue;

    const stock = producto.stock.find((s: any) => s.deposito === pedido.deposito);
    if (!stock) continue;

    if (accion === 'descontar') {
      if (stock.cantidad < item.cantidad) {
        throw new Error(`Stock insuficiente para "${item.nombre}" en depósito "${pedido.deposito}". Disponible: ${stock.cantidad}`);
      }
      stock.cantidad -= item.cantidad;
    } else if (accion === 'devolver') {
      stock.cantidad += item.cantidad;
    }

    await producto.save();

    notifyProducts({
      type: 'stock_modificado',
      data: {
        producto,
        motivo: accion === 'descontar' ? 'pedido_en_preparacion' : 'pedido_cancelado',
        pedidoId: pedido._id,
      },
    });
  }
}

export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const { id } = params;
    const { estado } = await request.json();

    const estadosValidos = ['pendiente', 'preparacion', 'enviado', 'entregado', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const pedido = await Pedido.findById(id).populate('productos.producto');
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    const estadoAnterior = pedido.estado;

    /* =========================
       PEDIDO ONLINE O MOSTRADOR: PENDIENTE → PREPARACION
    ========================= */
    if (estadoAnterior === 'pendiente' && estado === 'preparacion') {
      if (pedido.origen === 'online') {
        // descontar stock reservado y stock real
        await procesarStockReservado(pedido, 'liberar'); // libera el reservado
        await procesarStockFisico(pedido, 'descontar');   // descuenta stock real
      } else {
        // mostrador → solo stock real
        await procesarStockFisico(pedido, 'descontar');
      }
    }

    /* =========================
       PEDIDO CANCELADO DESDE PREPARACION
    ========================= */
    if (estadoAnterior === 'preparacion' && estado === 'cancelado') {
      if (pedido.origen === 'online') {
        // vuelve a reservar y devuelve stock real
        await procesarStockReservado(pedido, 'descontar'); // vuelve a reservar
        await procesarStockFisico(pedido, 'devolver');
      } else {
        // mostrador → solo devolver stock real
        await procesarStockFisico(pedido, 'devolver');
      }
    }

    // Actualizar estado
    pedido.estado = estado;
    await pedido.save();

    // Notificar cambio de estado
    notifyPedidoClients({
      type: estado === 'cancelado' ? 'pedido_cancelado' : 'pedido_estado_actualizado',
      data: pedido,
    });

    return NextResponse.json(pedido, { status: 200 });

  } catch (error: any) {
    console.error('Error al actualizar estado del pedido:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
