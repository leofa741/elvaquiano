import { NextRequest, NextResponse } from 'next/server';
import Pedido from '@/app/models/Pedido';
import Producto from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';

connectDB();

const CONCEPTO_MANUAL_ID = '000000000000000000000000';

function validarCantidad(cantidad: number) {
  if (typeof cantidad !== 'number' || isNaN(cantidad) || cantidad <= 0) return { valido: false, error: 'Cantidad debe ser un número mayor a 0' };
  if ((cantidad.toString().split('.')[1]?.length || 0) > 3) return { valido: false, error: 'Máximo 3 decimales' };
  return { valido: true };
}

function validarPrecio(precio: number) {
  if (typeof precio !== 'number' || isNaN(precio) || precio <= 0) return { valido: false, error: 'Precio debe ser un número mayor a 0' };
  return { valido: true };
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const { id, productoIndex } = await params;
    const index = parseInt(productoIndex, 10);

    if (isNaN(index)) return NextResponse.json({ error: 'Índice inválido' }, { status: 400 });

    const pedido = await Pedido.findById(id);
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    if (pedido.estado === 'cancelado') return NextResponse.json({ error: 'No se puede modificar un pedido cancelado' }, { status: 400 });
    if (index < 0 || index >= pedido.productos.length) return NextResponse.json({ error: 'Índice fuera de rango' }, { status: 400 });

    // ✅ ELIMINADO: Lógica de devolución de stock

    pedido.productos.splice(index, 1);
    pedido.total = parseFloat(pedido.productos.reduce((sum: any, p: any) => sum + Number(p.subtotal), 0).toFixed(2));

    if (pedido.productos.length === 0) pedido.estado = 'cancelado';

    await pedido.save();
    notifyPedidoClients({ type: 'pedido_actualizado', data: pedido });
    return NextResponse.json(pedido, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: any) {
  try {
    const { id } = await params;
    const { productoId, cantidad, precioPersonalizado, actualizarProducto, nombrePersonalizado, unidadPersonalizada } = await request.json();

    const validacion = validarCantidad(cantidad);
    if (!productoId || !validacion.valido) return NextResponse.json({ error: validacion.error || 'Datos inválidos' }, { status: 400 });

    const pedido = await Pedido.findById(id);
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    if (pedido.estado === 'cancelado') return NextResponse.json({ error: 'No se puede modificar un pedido cancelado' }, { status: 400 });

    let productoDB: any;
    const esConceptoManual = productoId === CONCEPTO_MANUAL_ID;

    if (esConceptoManual) {
      productoDB = { _id: CONCEPTO_MANUAL_ID, nombre: nombrePersonalizado || 'CONCEPTO MANUAL', unidad: unidadPersonalizada || 'unidad', precioMayorista: 0, precioOferta: 0, stock: [] };
    } else {
      productoDB = await Producto.findById(productoId);
      if (!productoDB) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // ✅ VERIFICAR STOCK SOLO PARA AVISAR, SIN BLOQUEAR
    let warningMsg = null;
    if (!esConceptoManual) {
      const stock = productoDB.stock?.find((s: any) => s.deposito === pedido.deposito);
      if (stock && stock.cantidad < cantidad) {
        const faltante = parseFloat((cantidad - stock.cantidad).toFixed(3));
        warningMsg = `⚠️ Stock insuficiente. Faltan ${faltante} ${productoDB.unidad}(s) de "${productoDB.nombre}" en el depósito.`;
      }
    }

    let precioAplicado = productoDB.precioMayorista || 0;
    let tipoPrecio: 'mayorista' | 'oferta' = 'mayorista';
    if (productoDB.precioOferta && productoDB.precioOferta < productoDB.precioMayorista) {
      precioAplicado = productoDB.precioOferta;
      tipoPrecio = 'oferta';
    }

    if (precioPersonalizado !== undefined) {
      const valPrecio = validarPrecio(precioPersonalizado);
      if (!valPrecio.valido) return NextResponse.json({ error: valPrecio.error }, { status: 400 });
      precioAplicado = precioPersonalizado;
    }

    if (actualizarProducto && precioPersonalizado !== undefined && !esConceptoManual) {
      if (tipoPrecio === 'mayorista') productoDB.precioMayorista = precioPersonalizado;
      else if (tipoPrecio === 'oferta') productoDB.precioOferta = precioPersonalizado;
      await productoDB.save();
      notifyProducts({ type: 'producto_actualizado', data: productoDB });
    }

    const cantidadRedondeada = parseFloat(cantidad.toFixed(3));
    const subtotal = parseFloat((cantidadRedondeada * precioAplicado).toFixed(2));

    pedido.productos.push({
      producto: productoDB._id, nombre: productoDB.nombre, unidad: productoDB.unidad,
      cantidad: cantidadRedondeada, tipoPrecio, precioAplicado, subtotal, deposito: pedido.deposito
    });
    
    pedido.total = parseFloat((Number(pedido.total) + subtotal).toFixed(2));
    await pedido.save();

    notifyPedidoClients({ type: 'pedido_actualizado', data: pedido });
    
    // ✅ DEVOLVEMOS EL PEDIDO CON LA POSIBLE ADVERTENCIA (sin fallar)
    return NextResponse.json({ ...pedido.toObject(), warning: warningMsg }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}