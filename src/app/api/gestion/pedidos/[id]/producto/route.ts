import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';

connectDB();

// ✅ ID reservado para conceptos manuales / deuda
const CONCEPTO_MANUAL_ID = '000000000000000000000000';

// ✅ Helper para validar cantidad decimal
function validarCantidad(cantidad: number): { valido: boolean; error?: string } {
  if (typeof cantidad !== 'number' || isNaN(cantidad)) {
    return { valido: false, error: 'Cantidad debe ser un número' };
  }
  if (cantidad <= 0) {
    return { valido: false, error: 'Cantidad debe ser mayor a 0' };
  }
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
export async function DELETE(request: NextRequest, { params }: any) {
    try {
        const { id, productoIndex } = await params;
        const index = parseInt(productoIndex, 10);

        if (isNaN(index)) {
            return NextResponse.json({ error: 'Índice de producto inválido' }, { status: 400 });
        }

        const pedido = await Pedido.findById(id).populate('productos.producto');
        if (!pedido) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        if (pedido.estado === 'cancelado') {
            return NextResponse.json({ error: 'No se puede modificar un pedido cancelado' }, { status: 400 });
        }

        if (index < 0 || index >= pedido.productos.length) {
            return NextResponse.json({ error: 'Índice de producto fuera de rango' }, { status: 400 });
        }

        const productoAEliminar = pedido.productos[index];

        // Si el pedido está en "preparacion" y NO es un concepto manual, devolver el stock
        if (pedido.estado === 'preparacion' && productoAEliminar.producto.toString() !== CONCEPTO_MANUAL_ID) {
            const productoDB = await Producto.findById(productoAEliminar.producto);
            if (productoDB) {
                const stock = productoDB.stock.find((s: any) => s.deposito === pedido.deposito);
                if (stock) {
                    stock.cantidad += productoAEliminar.cantidad;
                    await productoDB.save();
                    notifyProducts({
                        type: 'stock_modificado',
                        data: { producto: productoDB, motivo: 'producto_eliminado_de_pedido_en_preparacion', pedidoId: pedido._id },
                    });
                }
            }
        }

        pedido.productos.splice(index, 1);
        pedido.total = pedido.productos.reduce((sum: any, p: { subtotal: any; }) => sum + Number(p.subtotal), 0);

        if (pedido.productos.length === 0) {
            pedido.estado = 'cancelado';
        }

        await pedido.save();

        notifyPedidoClients({ type: 'pedido_actualizado', data: pedido });
        return NextResponse.json(pedido, { status: 200 });
    } catch (error: any) {
        console.error('Error al eliminar producto del pedido:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: any) {
    try {
        const { id } = await params;
        const { productoId, cantidad, precioPersonalizado, actualizarProducto, nombrePersonalizado, unidadPersonalizada } = await request.json();

        const validacion = validarCantidad(cantidad);
        if (!productoId || !validacion.valido) {
            return NextResponse.json({ error: validacion.error || 'Datos inválidos' }, { status: 400 });
        }

        const pedido = await Pedido.findById(id).populate('productos.producto');
        if (!pedido) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        if (pedido.estado === 'cancelado') {
            return NextResponse.json({ error: 'No se puede modificar un pedido cancelado' }, { status: 400 });
        }

        // ✅ 1. LÓGICA CLAVE: Si es el ID dummy, creamos un objeto en memoria
        let productoDB: any;
        let esConceptoManual = false;

        if (productoId === CONCEPTO_MANUAL_ID) {
            esConceptoManual = true;
            productoDB = {
                _id: CONCEPTO_MANUAL_ID,
                nombre: nombrePersonalizado || 'CONCEPTO MANUAL',
                unidad: unidadPersonalizada || 'unidad',
                precioMayorista: 0,
                precioOferta: 0,
                stock: []
            };
        } else {
            productoDB = await Producto.findById(productoId);
            if (!productoDB) {
                return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
            }
        }

        // ✅ 2. Verificar stock SOLO si es un producto real y el pedido está en preparación
        if (pedido.estado === 'preparacion' && !esConceptoManual) {
            const stock = productoDB.stock.find((s: any) => s.deposito === pedido.deposito);
            if (!stock || stock.cantidad < cantidad) {
                return NextResponse.json(
                    { error: `Stock insuficiente para "${productoDB.nombre}". Disponible: ${stock?.cantidad || 0}` },
                    { status: 400 }
                );
            }
        }

        // ✅ 3. Determinar precio a aplicar
        let precioAplicado = productoDB.precioMayorista || 0;
        let tipoPrecio: 'mayorista' | 'oferta' = 'mayorista';

        if (productoDB.precioOferta && productoDB.precioOferta < productoDB.precioMayorista) {
          precioAplicado = productoDB.precioOferta;
          tipoPrecio = 'oferta';
        }

        if (precioPersonalizado !== undefined) {
          const validacionPrecio = validarPrecio(precioPersonalizado);
          if (!validacionPrecio.valido) {
            return NextResponse.json({ error: validacionPrecio.error || 'Precio personalizado inválido' }, { status: 400 });
          }
          precioAplicado = precioPersonalizado;
        }

        // ✅ 4. Opcional: Actualizar el producto en la base de datos (SOLO si es producto real)
        if (actualizarProducto && precioPersonalizado !== undefined && !esConceptoManual) {
          if (tipoPrecio === 'mayorista') {
            productoDB.precioMayorista = precioPersonalizado;
          } else if (tipoPrecio === 'oferta') {
            productoDB.precioOferta = precioPersonalizado;
          }
          await productoDB.save();
          notifyProducts({ type: 'producto_actualizado', data: productoDB });
        }

        // ✅ 5. Crear el item y agregarlo al pedido
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

        pedido.productos.push(nuevoItem as any);
        pedido.total = parseFloat((Number(pedido.total) + subtotal).toFixed(2));

        // ✅ 6. Descontar stock SOLO si es un producto real
        if (pedido.estado === 'preparacion' && !esConceptoManual) {
            const stock = productoDB.stock.find((s: any) => s.deposito === pedido.deposito)!;
            stock.cantidad -= cantidadRedondeada;
            await productoDB.save();

            notifyProducts({
                type: 'stock_modificado',
                data: { producto: productoDB, motivo: 'producto_agregado_a_pedido_en_preparacion', pedidoId: pedido._id },
            });
        }

        await pedido.save();

        // ✅ 7. Notificaciones
        if (!esConceptoManual) {
            notifyProducts({
                type: 'stock_modificado',
                data: { producto: productoDB, motivo: 'producto_agregado_a_pedido', pedidoId: pedido._id },
            });
        }

        notifyPedidoClients({ type: 'pedido_actualizado', data: pedido });

        return NextResponse.json(pedido, { status: 201 });
    } catch (error: any) {
        console.error('Error al agregar producto al pedido:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}