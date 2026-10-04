// Ruta para actualizar el estado de un pedido (pendiente, preparación, enviado, entregado, cancelado)

import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';
import { notifyProducts } from '../../../productos/events/productsNotifier';

connectDB();

/* =====================================
   STOCK REAL (físico)
   ✅ MODIFICADO: Ahora devuelve un array de advertencias y motivo dinámico
===================================== */
async function procesarStockFisico(
  pedido: any,
  accion: 'descontar' | 'devolver',
  motivoNotificacion: string
): Promise<string[]> {
  const advertencias: string[] = [];

  for (const item of pedido.productos) {
    const producto = await Producto.findById(item.producto);
    if (!producto) continue;

    const stock = producto.stock.find(
      (s: any) => s.deposito === pedido.deposito
    );
    if (!stock) continue;

    if (accion === 'descontar') {
      if (stock.cantidad < item.cantidad) {
        advertencias.push(
          `Stock insuficiente para "${item.nombre}" en ${pedido.deposito}. Disponible: ${stock.cantidad}, solicitado: ${item.cantidad}.`
        );
      }
      
      // "Que lo lleve a cero": Restamos, pero nunca permitimos que baje de 0
      stock.cantidad = Math.max(0, stock.cantidad - item.cantidad);
    }

    if (accion === 'devolver') {
      stock.cantidad += item.cantidad;
    }

    await producto.save();

    notifyProducts({
      type: 'stock_modificado',
      data: {
        producto,
        motivo: motivoNotificacion, // ✅ Ahora es dinámico
        pedidoId: pedido._id,
      },
    });
  }
  
  return advertencias;
}

/* =====================================
   PATCH ESTADO PEDIDO
===================================== */
export async function PATCH(request: NextRequest, { params }: any) {
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
    let advertenciasStock: string[] = [];

    /* =====================================
       1. pendiente → preparacion
       (Descontar stock físico)
    ===================================== */
    if (estadoAnterior === 'pendiente' && estado === 'preparacion') {
      advertenciasStock = await procesarStockFisico(
        pedido, 
        'descontar', 
        'pedido_en_preparacion'
      );
    }

    /* =====================================
       2. preparacion → pendiente 
       ✅ NUEVO: Devolver stock si se había descontado por error
    ===================================== */
    if (estadoAnterior === 'preparacion' && estado === 'pendiente') {
      await procesarStockFisico(
        pedido, 
        'devolver', 
        'correccion_estado_a_pendiente'
      );
    }

    /* =====================================
       3. preparacion/enviado/entregado → cancelado
       (Devolver stock físico si ya se había descontado)
    ===================================== */
    if (
      ['preparacion', 'enviado', 'entregado'].includes(estadoAnterior) && 
      estado === 'cancelado'
    ) {
      await procesarStockFisico(
        pedido, 
        'devolver', 
        'pedido_cancelado'
      );
    }

    // Guardar el nuevo estado
    pedido.estado = estado;
    await pedido.save();

    notifyPedidoClients({
      type:
        estado === 'cancelado'
          ? 'pedido_cancelado'
          : 'pedido_estado_actualizado',
      data: pedido,
    });

    /* =====================================
       RESPUESTA: Si hay advertencias, las enviamos con status 200 (Éxito)
    ===================================== */
    if (advertenciasStock.length > 0) {
      return NextResponse.json({
        ...pedido.toObject(),
        warning: advertenciasStock.join(' | ')
      }, { status: 200 });
    }

    return NextResponse.json(pedido, { status: 200 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}