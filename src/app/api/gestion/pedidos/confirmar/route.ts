import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';

export async function POST(req: Request) {
  try {
    await connectDB();

    const { cart } = await req.json();

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { error: 'Carrito inválido' },
        { status: 400 }
      );
    }

    // 1️⃣ VALIDAR STOCK DISPONIBLE
    for (const item of cart) {
      const product = await Product.findById(item._id);

      if (!product || !product.activo) {
        return NextResponse.json(
          { error: `Producto no disponible` },
          { status: 404 }
        );
      }

      const stockTotal = product.stock.reduce(
        (acc: number, s: any) => acc + s.cantidad,
        0
      );

      const disponible = stockTotal - product.stockReservado;

      if (item.qty > disponible) {
        return NextResponse.json({
          error: `Stock insuficiente para ${product.nombre}. Disponible: ${disponible}`
        }, { status: 400 });
      }
    }

    // 2️⃣ RESERVAR STOCK (NO DESCONTAR)
    for (const item of cart) {
      const product = await Product.findById(item._id);

      product.stockReservado += item.qty;
      await product.save();

      notifyProducts({
        type: 'stock_reservado',
        data: product,
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Error al confirmar pedido' },
      { status: 500 }
    );
  }
}
