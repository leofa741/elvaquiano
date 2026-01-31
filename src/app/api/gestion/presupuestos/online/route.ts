import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import Presupuesto from '@/app/models/Presupuesto';
import { NextResponse } from 'next/server';
import Producto from '@/app/models/Product';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';

async function reservarStockOnline(productos: any[]) {
  for (const item of productos) {
    const producto = await Producto.findById(item.producto);
    if (!producto) continue;

    producto.stockReservado = (producto.stockReservado || 0) + item.cantidad;
    await producto.save();

    // 🔔 Notificar en tiempo real
    notifyProducts({
      type: 'stock_reservado',
      data: producto,
    });
  }
}



export async function POST(req: Request) {
  try {
    await connectDB();

    const DEPOSITO_DEFAULT = 'san vicente';

    const body = await req.json();
    const { cliente: clienteInput, cart } = body;

    if (!clienteInput?.razonSocial || !clienteInput?.telefono || !cart?.length) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 🔍 Buscar cliente
    let cliente = await Cliente.findOne({
      razonSocial: clienteInput.razonSocial.trim(),
    });

    // ➕ Crear cliente si no existe
    if (!cliente) {
      cliente = await Cliente.create({
        razonSocial: clienteInput.razonSocial.trim(),
        nombre: 'Cliente',
        apellido: 'Online',
        telefono: clienteInput.telefono.trim(),
        activo: true,
        origen: 'online',
      });
    }

    // 📦 Productos
    const productos = cart.map((p: any) => {
      const precioAplicado =
        p.precioOferta && p.precioOferta < p.precioMayorista
          ? p.precioOferta
          : p.precioMayorista;

      return {
        producto: p._id,
        nombre: p.nombre,
        unidad: p.unidad,
        cantidad: p.qty,
        unidadesFisicas: p.qty,
        tipoPrecio:
          precioAplicado === p.precioMayorista ? 'mayorista' : 'oferta',
        precioAplicado,
        subtotal: precioAplicado * p.qty,
        deposito: DEPOSITO_DEFAULT,
      };
    });

    const total = productos.reduce(
      (acc: number, p: any) => acc + p.subtotal,
      0
    );

    // 🧾 Crear presupuesto
    const presupuesto = await Presupuesto.create({
      cliente: cliente._id,
      productos,
      total,
      estado: 'borrador',
      origen: 'online',
    });

    // ✅ RESERVAR STOCK ONLINE (LO NUEVO)
    await reservarStockOnline(productos);

    return NextResponse.json({
      _id: presupuesto._id,
      total,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


