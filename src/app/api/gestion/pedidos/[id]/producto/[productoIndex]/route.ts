import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';

connectDB();



export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const { id, productoIndex } = params;
    const index = parseInt(productoIndex, 10);

    if (isNaN(index)) {
      return NextResponse.json({ error: 'Índice de producto inválido' }, { status: 400 });
    }

    const pedido = await Pedido.findById(id);
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (['entregado', 'cancelado'].includes(pedido.estado)) {
      return NextResponse.json(
        { error: 'No se puede modificar un pedido entregado o cancelado' },
        { status: 400 }
      );
    }

    if (index < 0 || index >= pedido.productos.length) {
      return NextResponse.json({ error: 'Índice fuera de rango' }, { status: 400 });
    }

    const item = pedido.productos[index];

    // devolver stock si está en preparación
    if (pedido.estado === 'preparacion') {
      const productoDB = await Producto.findById(item.producto);
      if (productoDB) {
        const stock = productoDB.stock.find((s: any) => s.deposito === pedido.deposito);
        if (stock) {
          stock.cantidad += item.cantidad;
          await productoDB.save();

          notifyProducts({
            type: 'stock_modificado',
            data: {
              producto: productoDB,
              motivo: 'producto_eliminado_de_pedido',
              pedidoId: pedido._id,
            },
          });
        }
      }
    }

    pedido.productos.splice(index, 1);
    pedido.total = pedido.productos.reduce((sum: any, p: { subtotal: any; }) => sum + p.subtotal, 0);

    if (pedido.productos.length === 0) {
      pedido.estado = 'cancelado';
    }

    await pedido.save();

    notifyProducts({
      type: 'stock_modificado',
      data: {
        producto: item.producto,
        motivo: 'producto_eliminado_de_pedido',
        pedidoId: pedido._id,
      },
    });

    notifyPedidoClients({
      type: 'pedido_actualizado',
      data: pedido,
    });

    return NextResponse.json(pedido);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
