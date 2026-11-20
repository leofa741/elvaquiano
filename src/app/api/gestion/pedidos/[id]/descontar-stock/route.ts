import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';

connectDB();

const CONCEPTO_MANUAL_ID = '000000000000000000000000';

export async function POST(request: NextRequest, { params }: any) {
  try {
    const { id } = await params;
    const pedido = await Pedido.findById(id);
    
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // 🔒 SEGURIDAD: Si ya se descontó, no hacemos nada (evita dobles descuentos)
    if (pedido.stockDescontado === true) {
      return NextResponse.json({ message: 'El stock ya fue descontado previamente.', yaDescontado: true }, { status: 200 });
    }

    const operaciones: any[] = [];
    const idsProductosAfectados = new Set();

    for (const item of pedido.productos) {
      // Ignorar conceptos manuales o items sin producto vinculado
      if (!item.producto || item.producto.toString() === CONCEPTO_MANUAL_ID) continue;

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
                        { $eq: ["$$s.deposito", pedido.deposito] },
                        {
                          $mergeObjects: [
                            "$$s",
                            {
                              cantidad: {
                                $max: [0, { $subtract: ["$$s.cantidad", item.cantidad] }]
                              }
                            }
                          ]
                        },
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
      idsProductosAfectados.add(item.producto.toString());
    }

    if (operaciones.length > 0) {
      await Producto.bulkWrite(operaciones, { ordered: false });
    }

    // Marcar el pedido como procesado
    await Pedido.findByIdAndUpdate(pedido._id, { stockDescontado: true });

    // Notificaciones
    const productosActualizados = await Producto.find({ _id: { $in: Array.from(idsProductosAfectados) } });
    productosActualizados.forEach(prod => {
      notifyProducts({ 
        type: 'stock_modificado', 
        data: { producto: prod, motivo: 'descontado_al_imprimir_ticket', pedidoId: pedido._id } 
      });
    });

    return NextResponse.json({ message: 'Stock descontado exitosamente', yaDescontado: false }, { status: 200 });
  } catch (error: any) {
    console.error('Error al descontar stock:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}