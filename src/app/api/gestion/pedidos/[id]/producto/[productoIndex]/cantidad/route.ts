// app/api/gestion/pedidos/[id]/producto/[productoIndex]/cantidad/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';

connectDB();


export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const { id, productoIndex } = params;
    const { nuevaCantidad } = await request.json();
    const index = parseInt(productoIndex, 10);

    if (isNaN(index) || nuevaCantidad <= 0 || !Number.isInteger(nuevaCantidad)) {
      return NextResponse.json({ error: 'Cantidadd inválida' }, { status: 400 });
    }

    const pedido = await Pedido.findById(id).populate('productos.producto');
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (['entregado', 'cancelado'].includes(pedido.estado)) {
      return NextResponse.json({ error: 'No se puede modificar un pedido entregado o cancelado' }, { status: 400 });
    }

    if (index < 0 || index >= pedido.productos.length) {
      return NextResponse.json({ error: 'Índice de producto inválido' }, { status: 400 });
    }

    const item = pedido.productos[index];
    const diferencia = item.cantidad - nuevaCantidad; // positiva si se reduce

    // Manejo de stock solo si está en "preparacion"
    if (pedido.estado === 'preparacion') {
      const productoDB = await Producto.findById(item.producto);
      if (productoDB) {
        const stock = productoDB.stock.find((s: any) => s.deposito === pedido.deposito);
        if (stock) {
          // Si se reduce: devolver stock
          // Si se aumenta: verificar que haya stock suficiente
          if (diferencia > 0) {
            stock.cantidad += diferencia;
          } else if (diferencia < 0) {
            const stockNecesario = Math.abs(diferencia);
            if (stock.cantidad < stockNecesario) {
              return NextResponse.json(
                { error: `Stock insuficiente para "${item.nombre}". Disponible: ${stock.cantidad}` },
                { status: 400 }
              );
            }
            stock.cantidad -= stockNecesario;
          }
          await productoDB.save();

          notifyProducts({
            type: 'stock_modificado',
            data: {
              producto: productoDB,
              motivo: 'cantidad_modificada_en_pedido',
              pedidoId: pedido._id,
            },
          });
        }
      }
    }

    // Actualizar cantidad y subtotal
    item.cantidad = nuevaCantidad;
    item.subtotal = nuevaCantidad * item.precioAplicado;

    // Recalcular total
    pedido.total = pedido.productos.reduce((sum: any, p: { subtotal: any; }) => sum + p.subtotal, 0);

    await pedido.save();

    notifyPedidoClients({
      type: 'pedido_actualizado',
      data: pedido,
    });

    return NextResponse.json(pedido, { status: 200 });
  } catch (error: any) {
    console.error('Error al modificar cantidad:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}