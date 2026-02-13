// app/api/gestion/pedidos/[id]/producto/[productoIndex]/cantidad/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';

connectDB();

// ✅ Helper para validar cantidad decimal
function validarCantidad(cantidad: number): { valido: boolean; error?: string } {
  if (typeof cantidad !== 'number' || isNaN(cantidad)) {
    return { valido: false, error: 'Cantidad debe ser un número' };
  }
  
  if (cantidad <= 0) {
    return { valido: false, error: 'Cantidad debe ser mayor a 0' };
  }
  
  // ✅ Validar máximo 3 decimales (precisión de gramos/mililitros)
  const decimales = cantidad.toString().split('.')[1]?.length || 0;
  if (decimales > 3) {
    return { valido: false, error: 'Cantidad no puede tener más de 3 decimales' };
  }
  
  return { valido: true };
}

// ✅ Helper para validar precio
function validarPrecio(precio: number): { valido: boolean; error?: string } {
  if (typeof precio !== 'number' || isNaN(precio)) {
    return { valido: false, error: 'Precio debe ser un número' };
  }
  
  if (precio <= 0) {
    return { valido: false, error: 'Precio debe ser mayor a 0' };
  }
  
  return { valido: true };
}

export async function PATCH(request: NextRequest, { params }: any) {
  try {
    // ✅ FIX: Await params antes de usarlo
    const { id, productoIndex } = await params;
    const { nuevaCantidad, nuevoPrecio, actualizarProducto } = await request.json();
    const index = parseInt(productoIndex, 10);

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

    // ✅ Si se modifica cantidad, validar y actualizar stock
    if (nuevaCantidad !== undefined) {
      const validacion = validarCantidad(nuevaCantidad);
      if (!validacion.valido) {
        return NextResponse.json({ error: validacion.error || 'Cantidad inválida' }, { status: 400 });
      }

      const diferencia = item.cantidad - nuevaCantidad;

      // Manejo de stock solo si está en "preparacion"
      if (pedido.estado === 'preparacion') {
        const productoDB = await Producto.findById(item.producto);
        if (productoDB) {
          const stock = productoDB.stock.find((s: any) => s.deposito === pedido.deposito);
          if (stock) {
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

      // ✅ Actualizar cantidad y subtotal
      item.cantidad = parseFloat(nuevaCantidad.toFixed(3));
    }

    // ✅ Si se modifica precio, actualizar
    if (nuevoPrecio !== undefined) {
      const validacionPrecio = validarPrecio(nuevoPrecio);
      if (!validacionPrecio.valido) {
        return NextResponse.json({ error: validacionPrecio.error || 'Precio inválido' }, { status: 400 });
      }

      item.precioAplicado = nuevoPrecio;

      // ✅ Opcional: Actualizar el producto en la base de datos
      if (actualizarProducto) {
        const productoDB = await Producto.findById(item.producto);
        if (productoDB) {
          // Determinar si actualizar precioMayorista o precioOferta
          if (item.tipoPrecio === 'mayorista') {
            productoDB.precioMayorista = nuevoPrecio;
          } else if (item.tipoPrecio === 'oferta') {
            productoDB.precioOferta = nuevoPrecio;
          }
          await productoDB.save();

          notifyProducts({
            type: 'producto_actualizado',
            data: productoDB,
          });
        }
      }
    }

    // ✅ Recalcular subtotal y total
    item.subtotal = parseFloat((item.cantidad * item.precioAplicado).toFixed(2));
    pedido.total = parseFloat(
      pedido.productos.reduce((sum: any, p: { subtotal: any; }) => sum + p.subtotal, 0).toFixed(2)
    );

    await pedido.save();

    notifyPedidoClients({
      type: 'pedido_actualizado',
      data: pedido,
    });

    return NextResponse.json(pedido, { status: 200 });
  } catch (error: any) {
    console.error('Error al modificar cantidad/precio:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}