import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';
import { notifyProducts } from '../../../productos/events/productsNotifier';

connectDB();

/* =====================================
   STOCK RESERVADO (solo online)
===================================== */
async function procesarStockReservado(
  pedido: any,
  accion: 'liberar' | 'descontar'
) {
  if (pedido.origen !== 'online') return;

  for (const item of pedido.productos) {
    const producto = await Producto.findById(item.producto);
    if (!producto) continue;

    if (accion === 'liberar') {
      producto.stockReservado = Math.max(
        0,
        (producto.stockReservado || 0) - item.cantidad
      );
    }

    if (accion === 'descontar') {
      producto.stockReservado = Math.max(
        0,
        (producto.stockReservado || 0) + item.cantidad
      );
    }

    await producto.save();

    notifyProducts({
      type: 'stock_reservado',
      data: producto,
    });
  }
}

/* =====================================
   STOCK REAL (físico)
===================================== */
async function procesarStockFisico(
  pedido: any,
  accion: 'descontar' | 'devolver'
) {
  for (const item of pedido.productos) {
    const producto = await Producto.findById(item.producto);
    if (!producto) continue;

    const stock = producto.stock.find(
      (s: any) => s.deposito === pedido.deposito
    );
    if (!stock) continue;

    if (accion === 'descontar') {
      if (stock.cantidad < item.cantidad) {
        throw new Error(
          `Stock insuficiente para "${item.nombre}" en ${pedido.deposito}`
        );
      }
      stock.cantidad -= item.cantidad;
    }

    if (accion === 'devolver') {
      stock.cantidad += item.cantidad;
    }

    await producto.save();

    notifyProducts({
      type: 'stock_modificado',
      data: {
        producto,
        motivo:
          accion === 'descontar'
            ? 'pedido_en_preparacion'
            : 'pedido_cancelado',
        pedidoId: pedido._id,
      },
    });
  }
}

/* =====================================
   PATCH ESTADO PEDIDO
===================================== */
export async function PATCH(request: NextRequest, { params }: any)  {



  try {
    const { estado } = await request.json();
    const { id } = params;

    const estadosValidos = [
      'pendiente',
      'preparacion',
      'enviado',
      'entregado',
      'cancelado',
    ];

    if (!estadosValidos.includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    const pedido = await Pedido.findById(id);
    if (!pedido) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    const estadoAnterior = pedido.estado;

    /* =====================================
       ONLINE: pendiente → cancelado
    ===================================== */
    if (estadoAnterior === 'pendiente' && estado === 'cancelado') {
      if (pedido.origen === 'online') {
        await procesarStockReservado(pedido, 'liberar');
      }
    }

    /* =====================================
       pendiente → preparacion
    ===================================== */
    if (estadoAnterior === 'pendiente' && estado === 'preparacion') {
      if (pedido.origen === 'online') {
        await procesarStockReservado(pedido, 'liberar');
        await procesarStockFisico(pedido, 'descontar');
      } else {
        await procesarStockFisico(pedido, 'descontar');
      }
    }

    /* =====================================
       preparacion → cancelado
    ===================================== */
    if (estadoAnterior === 'preparacion' && estado === 'cancelado') {
      await procesarStockFisico(pedido, 'devolver');
    }

    pedido.estado = estado;
    await pedido.save();

    notifyPedidoClients({
      type:
        estado === 'cancelado'
          ? 'pedido_cancelado'
          : 'pedido_estado_actualizado',
      data: pedido,
    });

    return NextResponse.json(pedido, { status: 200 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
