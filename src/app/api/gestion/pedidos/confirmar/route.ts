import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';

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

    // 1️⃣ VALIDAR STOCK REAL
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

      if (item.qty > stockTotal) {
        return NextResponse.json(
          {
            error: `Stock insuficiente para ${product.nombre}. Disponible: ${stockTotal}`
          },
          { status: 400 }
        );
      }
    }

    // 2️⃣ DESCONTAR STOCK (DEPÓSITOS)
    for (const item of cart) {
      let restante = item.qty;

      const product = await Product.findById(item._id);

      for (const s of product.stock) {
        if (restante <= 0) break;

        const descontar = Math.min(s.cantidad, restante);
        s.cantidad -= descontar;
        restante -= descontar;
      }

      await product.save();
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
