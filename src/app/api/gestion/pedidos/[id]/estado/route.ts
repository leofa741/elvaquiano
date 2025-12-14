// app/api/gestion/pedidos/[id]/estado/route.ts
import { NextRequest, NextResponse } from 'next/server';

import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';

import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';
import { notifyProducts } from '../../../productos/events/productsNotifier';



connectDB();

export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const { id } = params;
    const { estado } = await request.json();

    const estadosValidos = ['pendiente', 'preparacion', 'enviado', 'entregado', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const pedido = await Pedido.findById(id).populate('productos.producto');
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const estadoAnterior = pedido.estado;

    /* =========================
       1️⃣ DESCONTAR STOCK
       pendiente → preparacion
    ========================= */
    if (estadoAnterior === 'pendiente' && estado === 'preparacion') {
      // validar stock
      for (const item of pedido.productos) {
        const producto = await Producto.findById(item.producto);
        if (!producto) {
          return NextResponse.json(
            { error: `Producto no encontrado` },
            { status: 400 }
          );
        }

        const stock = producto.stock.find(
          (s: any) => s.deposito === pedido.deposito
        );

        if (!stock || stock.cantidad < item.cantidad) {
          return NextResponse.json(
            {
              error: `Stock insuficiente para "${item.nombre}" en depósito "${pedido.deposito}". Disponible: ${stock?.cantidad || 0}`,
            },
            { status: 400 }
          );
        }
      }

      // descontar stock
      for (const item of pedido.productos) {
        const producto = await Producto.findById(item.producto);
        const stock = producto.stock.find(
          (s: any) => s.deposito === pedido.deposito
        )!;
        stock.cantidad -= item.cantidad;
        await producto.save();

        // 🔥 EVENTO DE STOCK
         notifyProducts({
          type: 'stock_modificado',
          data: {
            producto,
            motivo: 'pedido_en_preparacion',
            pedidoId: pedido._id,
          },
        });
      }
    }

    /* =========================
       2️⃣ DEVOLVER STOCK
       preparacion → cancelado
    ========================= */
    if (estadoAnterior === 'preparacion' && estado === 'cancelado') {
      for (const item of pedido.productos) {
        const producto = await Producto.findById(item.producto);
        if (!producto) continue;

        const stock = producto.stock.find(
          (s: any) => s.deposito === pedido.deposito
        );

        if (stock) {
          stock.cantidad += item.cantidad;
          await producto.save();

          // 🔥 EVENTO DE STOCK
          notifyProducts({
            type: 'stock_modificado',
            data: {
              producto,
              motivo: 'pedido_cancelado',
              pedidoId: pedido._id,
            },
          });
        }
      }
    }

    /* =========================
       3️⃣ ACTUALIZAR PEDIDO
    ========================= */
    pedido.estado = estado;
    await pedido.save();

    /* =========================
       4️⃣ EVENTO DE PEDIDO
    ========================= */
    notifyPedidoClients({
      type: estado === 'cancelado'
        ? 'pedido_cancelado'
        : 'pedido_estado_actualizado',
      data: pedido,
    });

    return NextResponse.json(pedido, { status: 200 });

  } catch (error: any) {
    console.error('Error al actualizar estado del pedido:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
