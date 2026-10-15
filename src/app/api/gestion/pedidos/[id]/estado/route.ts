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
      // 👇 SOLUCIÓN ATÓMICA DEFINITIVA CON PIPELINE:
      // Usamos $map para recorrer el array de stock. 
      // Es 100% atómico (evita race conditions) y no usa el operador '$' que causaba el error.
      operaciones.push({
        updateOne: {
          filter: { _id: item.producto, "stock.deposito": pedido.deposito },
          update: [
            {
              $set: {
                stock: {
                  $map: {
                    input: "$stock",
                    as: "s",
                    in: {
                      $cond: [
                        // Si es el depósito del pedido:
                        { $eq: ["$$s.deposito", pedido.deposito] },
                        {
                          // Fusionamos el objeto original con la nueva cantidad calculada
                          $mergeObjects: [
                            "$$s",
                            {
                              cantidad: {
                                // Resta la cantidad, pero si el resultado es < 0, lo fuerza a 0
                                $max: [0, { $subtract: ["$$s.cantidad", item.cantidad] }]
                              }
                            }
                          ]
                        },
                        // Si no es el depósito, se deja el objeto exactamente igual ("$$s")
                        "$$s"
                      ]
                    }
                  }
                }
              }
            }
          ]
        }
      });
    } else {
      // Para devolver stock, $inc es seguro y no genera negativos, así que lo dejamos simple.
      operaciones.push({
        updateOne: {
          filter: { _id: item.producto, "stock.deposito": pedido.deposito },
          update: {
            $inc: { "stock.$.cantidad": item.cantidad }
          }
        }
      });
    }
    
    idsProductosAfectados.add(item.producto.toString());
  }

  if (operaciones.length > 0) {
    // ordered: false permite que si un producto no existe, no bloquee la actualización de los demás
    await Producto.bulkWrite(operaciones, { ordered: false });
  }

  await Pedido.findByIdAndUpdate(pedido._id, {
    stockDescontado: accion === 'descontar' ? true : false
  });

  // Notificamos los cambios (fetcheamos el estado final para el websocket/notificaciones)
  const productosActualizados = await Producto.find({ _id: { $in: Array.from(idsProductosAfectados) } });
  productosActualizados.forEach(prod => {
    notifyProducts({ 
      type: 'stock_modificado', 
      data: { producto: prod, motivo: motivoNotificacion, pedidoId: pedido._id } 
    });
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