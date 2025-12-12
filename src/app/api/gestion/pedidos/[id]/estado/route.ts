// app/api/gestion/pedidos/[id]/estado/route.ts
import { NextRequest, NextResponse } from 'next/server';

import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
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

    if (estadoAnterior !== 'preparacion' && estado === 'preparacion') {
      for (const item of pedido.productos) {
        const producto = await Producto.findById(item.producto);
        if (!producto) {
          return NextResponse.json({ error: `Producto no encontrado: ${item.nombre}` }, { status: 400 });
        }

        const stockDeposito = producto.stock.find((s: any) => s.deposito === pedido.deposito);
        if (!stockDeposito || stockDeposito.cantidad < item.cantidad) {
          return NextResponse.json({
            error: `Stock insuficiente para "${item.nombre}" en depósito "${pedido.deposito}". Disponible: ${stockDeposito?.cantidad || 0}`
          }, { status: 400 });
        }
      }

      for (const item of pedido.productos) {
        const producto = await Producto.findById(item.producto);
        const stockDeposito = producto.stock.find((s: any) => s.deposito === pedido.deposito)!;
        stockDeposito.cantidad -= item.cantidad;
        await producto.save();

        notifyProducts({ type: "stock_modificado", data: { productoId: producto._id, deposito: pedido.deposito, nuevaCantidad: stockDeposito.cantidad } });
        
      }
    }

    if (estadoAnterior === 'preparacion' && estado === 'cancelado') {
      for (const item of pedido.productos) {
        const producto = await Producto.findById(item.producto);
        if (!producto) continue;
        const stockDeposito = producto.stock.find((s: any) => s.deposito === pedido.deposito);
        if (stockDeposito) {
          stockDeposito.cantidad += item.cantidad;
          await producto.save();
          notifyProducts({ type: "stock_modificado", data: { productoId: producto._id, deposito: pedido.deposito, nuevaCantidad: stockDeposito.cantidad } });
        }
      }
    }

    pedido.estado = estado;
    await pedido.save();

    return NextResponse.json(pedido, { status: 200 });

  } catch (error: any) {
    console.error('Error al actualizar estado del pedido:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
    
  }
}
