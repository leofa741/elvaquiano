// app/api/gestion/pedidos/[id]/producto/[productoIndex]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';

connectDB();

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; productoIndex: string } }
) {
    try {
        const { id, productoIndex } = params;
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
        const { id } = params;
        const { productoId, cantidad } = await request.json();

        if (!productoId || cantidad <= 0 || !Number.isInteger(cantidad)) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
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

        // Buscar precio aplicado
        const precioAplicado =
            pedido.cliente?.tipoCliente === 'mayorista' && productoDB.precioMayorista
                ? productoDB.precioMayorista
                : productoDB.precioMinorista || productoDB.precioLista;

        const nuevoItem = {
            producto: productoDB._id,
            nombre: productoDB.nombre,
            unidad: productoDB.unidad,
            cantidad,
            tipoPrecio: pedido.cliente?.tipoCliente === 'mayorista' ? 'mayorista' : 'minorista',
            precioAplicado,
            subtotal: cantidad * precioAplicado,
             deposito: pedido.deposito, // ✅ ¡ESTA LÍNEA ES LA CLAVE!
        };

        // Agregar al pedido
        pedido.productos.push(nuevoItem as any);
        pedido.total += nuevoItem.subtotal;

        // Si está en "preparacion", descontar stock
        if (pedido.estado === 'preparacion') {
            const stock = productoDB.stock.find((s: any) => s.deposito === pedido.deposito)!;
            stock.cantidad -= cantidad;
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