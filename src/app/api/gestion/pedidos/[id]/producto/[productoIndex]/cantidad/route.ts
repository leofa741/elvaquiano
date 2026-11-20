import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';

connectDB();

function validarCantidad(cantidad: number) {
  if (typeof cantidad !== 'number' || isNaN(cantidad) || cantidad <= 0) return { valido: false, error: 'Cantidad debe ser mayor a 0' };
  if ((cantidad.toString().split('.')[1]?.length || 0) > 3) return { valido: false, error: 'Máximo 3 decimales' };
  return { valido: true };
}

function validarPrecio(precio: number) {
  if (typeof precio !== 'number' || isNaN(precio) || precio <= 0) return { valido: false, error: 'Precio debe ser mayor a 0' };
  return { valido: true };
}

export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const { id, productoIndex } = await params;
    const { nuevaCantidad, nuevoPrecio, actualizarProducto, soloTicket, nuevoPesoAproximado } = await request.json();
    const index = parseInt(productoIndex, 10);

    const pedido = await Pedido.findById(id).populate('productos.producto');
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    if (['entregado', 'cancelado'].includes(pedido.estado)) return NextResponse.json({ error: 'No se puede modificar' }, { status: 400 });
    if (index < 0 || index >= pedido.productos.length) return NextResponse.json({ error: 'Índice inválido' }, { status: 400 });

    const item = pedido.productos[index];
    let warningMsg = null;

    if (nuevaCantidad !== undefined) {
      const validacion = validarCantidad(nuevaCantidad);
      if (!validacion.valido) return NextResponse.json({ error: validacion.error }, { status: 400 });
      
      // ✅ VERIFICAR STOCK SOLO PARA AVISAR, SIN MODIFICARLO
      const productoDB = await Producto.findById(item.producto);
      if (productoDB) {
        const stock = productoDB.stock?.find((s: any) => s.deposito === pedido.deposito);
        if (stock && stock.cantidad < nuevaCantidad) {
          const faltante = parseFloat((nuevaCantidad - stock.cantidad).toFixed(3));
          warningMsg = `⚠️ Stock insuficiente. Faltan ${faltante} ${productoDB.unidad}(s) de "${item.nombre}" en el depósito.`;
        }
      }
      
      item.cantidad = parseFloat(nuevaCantidad.toFixed(3));
    }

    if (nuevoPrecio !== undefined) {
      const validacionPrecio = validarPrecio(nuevoPrecio);
      if (!validacionPrecio.valido) return NextResponse.json({ error: validacionPrecio.error }, { status: 400 });

      item.precioAplicado = nuevoPrecio;

      if (actualizarProducto && !soloTicket) {
        const productoDB = await Producto.findById(item.producto);
        if (productoDB) {
          if (item.tipoPrecio === 'mayorista') productoDB.precioMayorista = nuevoPrecio;
          else if (item.tipoPrecio === 'oferta') productoDB.precioOferta = nuevoPrecio;
          await productoDB.save();
          notifyProducts({ type: 'producto_actualizado', data: productoDB });
        }
      }
    }

    if (nuevoPesoAproximado !== undefined) {
      item.pesoAproximado = nuevoPesoAproximado;
    }

    item.subtotal = parseFloat((item.cantidad * item.precioAplicado).toFixed(2));
    pedido.total = parseFloat(pedido.productos.reduce((sum: any, p: any) => sum + p.subtotal, 0).toFixed(2));

    await pedido.save();
    notifyPedidoClients({ type: 'pedido_actualizado', data: pedido });

    // ✅ DEVOLVEMOS EL PEDIDO CON LA POSIBLE ADVERTENCIA (sin fallar)
    return NextResponse.json({ ...pedido.toObject(), warning: warningMsg }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}