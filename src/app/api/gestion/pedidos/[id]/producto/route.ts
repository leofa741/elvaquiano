// app/api/gestion/pedidos/[id]/producto/route.ts
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
    return { valido: false, error: 'Cantidad no puede tener más de 3 decimales (máximo 1 gramo de precisión)' };
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

export async function DELETE(request: NextRequest, { params }: any) {
    try {
        // ✅ FIX: Await params
        const { id, productoIndex } = await params;
        const index = parseInt(productoIndex, 10);

        if (isNaN(index)) {
            return NextResponse.json({ error: 'Índice de producto inválido' }, { status: 400 });
        }

        const pedido = await Pedido.findById(id).populate('productos.producto');
        if (!pedido) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        // No permitir si ya está entregado o cancelado
        if (['entregado', 'cancelado'].includes(pedido.estado)) {
            return NextResponse.json({ error: 'No se puede modificar un pedido entregado o cancelado' }, { status: 400 });
        }

        if (index < 0 || index >= pedido.productos.length) {
            return NextResponse.json({ error: 'Índice de producto fuera de rango' }, { status: 400 });
        }

        const productoAEliminar = pedido.productos[index];

        // Si el pedido está en "preparacion", devolver el stock
        if (pedido.estado === 'preparacion') {
            const productoDB = await Producto.findById(productoAEliminar.producto);
            if (productoDB) {
                const stock = productoDB.stock.find((s: any) => s.deposito === pedido.deposito);
                if (stock) {
                    stock.cantidad += productoAEliminar.cantidad;
                    await productoDB.save();

                    notifyProducts({
                        type: 'stock_modificado',
                        data: {
                            producto: productoDB,
                            motivo: 'producto_eliminado_de_pedido_en_preparacion',
                            pedidoId: pedido._id,
                        },
                    });
                }
            }
        }

        // Eliminar el producto del pedido
        pedido.productos.splice(index, 1);

        // Recalcular total
        pedido.total = pedido.productos.reduce((sum: any, p: { subtotal: any; }) => sum + p.subtotal, 0);

        // Si no quedan productos, cancelar el pedido
        if (pedido.productos.length === 0) {
            pedido.estado = 'cancelado';
        }

        await pedido.save();

        // Notificar actualización
        notifyPedidoClients({
            type: 'pedido_actualizado',
            data: pedido,
        });

        return NextResponse.json(pedido, { status: 200 });
    } catch (error: any) {
        console.error('Error al eliminar producto del pedido:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: any) {
    try {
        // ✅ FIX: Await params
        const { id } = await params;
        const { productoId, cantidad, precioPersonalizado, actualizarProducto } = await request.json();

        // ✅ FIX: Validar cantidad con decimales
        const validacion = validarCantidad(cantidad);
        if (!productoId || !validacion.valido) {
            return NextResponse.json({ error: validacion.error || 'Datos inválidos' }, { status: 400 });
        }

        const pedido = await Pedido.findById(id).populate('productos.producto');
        if (!pedido) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        if (['entregado', 'cancelado'].includes(pedido.estado)) {
            return NextResponse.json({ error: 'No se puede modificar un pedido entregado o cancelado' }, { status: 400 });
        }

        // Buscar el producto en la base
        const productoDB = await Producto.findById(productoId);
        if (!productoDB) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        // Verificar stock si el pedido ya está en "preparacion"
        if (pedido.estado === 'preparacion') {
            const stock = productoDB.stock.find((s: any) => s.deposito === pedido.deposito);
            if (!stock || stock.cantidad < cantidad) {
                return NextResponse.json(
                    { error: `Stock insuficiente para "${productoDB.nombre}". Disponible: ${stock?.cantidad || 0}` },
                    { status: 400 }
                );
            }
        }

        // ✅ Determinar precio a aplicar
        let precioAplicado = productoDB.precioMayorista;
        let tipoPrecio: 'mayorista' | 'oferta' = 'mayorista';

        // Si hay precio de oferta válido, usarlo por defecto
        if (productoDB.precioOferta && productoDB.precioOferta < productoDB.precioMayorista) {
          precioAplicado = productoDB.precioOferta;
          tipoPrecio = 'oferta';
        }

        // ✅ Si se especifica precio personalizado, usarlo
        if (precioPersonalizado !== undefined) {
          const validacionPrecio = validarPrecio(precioPersonalizado);
          if (!validacionPrecio.valido) {
            return NextResponse.json({ error: validacionPrecio.error || 'Precio personalizado inválido' }, { status: 400 });
          }
          precioAplicado = precioPersonalizado;
          // Mantener el tipo de precio original (mayorista/oferta)
        }

        // ✅ Opcional: Actualizar el producto en la base de datos
        if (actualizarProducto && precioPersonalizado !== undefined) {
          if (tipoPrecio === 'mayorista') {
            productoDB.precioMayorista = precioPersonalizado;
          } else if (tipoPrecio === 'oferta') {
            productoDB.precioOferta = precioPersonalizado;
          }
          await productoDB.save();

          notifyProducts({
            type: 'producto_actualizado',
            data: productoDB,
          });
        }

        // ✅ Redondear cantidad a 3 decimales para evitar errores de precisión
        const cantidadRedondeada = parseFloat(cantidad.toFixed(3));
        const subtotal = parseFloat((cantidadRedondeada * precioAplicado).toFixed(2));

        const nuevoItem = {
            producto: productoDB._id,
            nombre: productoDB.nombre,
            unidad: productoDB.unidad,
            cantidad: cantidadRedondeada,
            tipoPrecio,
            precioAplicado,
            subtotal,
            deposito: pedido.deposito,
        };

        // Agregar al pedido
        pedido.productos.push(nuevoItem as any);
        pedido.total = parseFloat((pedido.total + subtotal).toFixed(2));

        // Si está en "preparacion", descontar stock
        if (pedido.estado === 'preparacion') {
            const stock = productoDB.stock.find((s: any) => s.deposito === pedido.deposito)!;
            stock.cantidad -= cantidadRedondeada;
            await productoDB.save();

            notifyProducts({
                type: 'stock_modificado',
                data: {
                    producto: productoDB,
                    motivo: 'producto_agregado_a_pedido_en_preparacion',
                    pedidoId: pedido._id,
                },
            });
        }

        await pedido.save();

        notifyProducts({
            type: 'stock_modificado',
            data: {
                producto: productoDB,
                motivo: 'producto_agregado_a_pedido',
                pedidoId: pedido._id,
            },
        });

        notifyPedidoClients({
            type: 'pedido_actualizado',
            data: pedido,
        });

        return NextResponse.json(pedido, { status: 201 });
    } catch (error: any) {
        console.error('Error al agregar producto al pedido:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}