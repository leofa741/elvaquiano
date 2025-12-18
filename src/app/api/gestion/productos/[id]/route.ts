// app/api/gestion/productos/[id]/route.ts
import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';
import { authOptions } from '@/app/lib/auth';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { notifyProducts } from '../events/productsNotifier';
import { normalizeProduct } from '../events/productsNotifier';



connectDB();

const isAdmin = (role: string) => ['admin', 'superadmin'].includes(role);

// GET: obtener producto por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const producto = await Product.findById((await params).id);
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PUT: actualizar producto (incluye detección de cambios en stock)
export async function PUT(
  request: NextRequest,
  { params }: { params: any }
){
  const session = await getServerSession(authOptions);

  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const body = await request.json();
  const productId = params.id;

  // 🔒 NORMALIZAR PRECIOS (CLAVE)
  const precioLista = Number(body.precioLista);
  const precioMayorista = Number(body.precioMayorista);
  const precioMinorista = Number(body.precioMinorista);

  // ❌ Validaciones de tipo y rango
  if (
    Number.isNaN(precioLista) ||
    Number.isNaN(precioMayorista) ||
    Number.isNaN(precioMinorista) ||
    precioLista < 0 ||
    precioMayorista < 0 ||
    precioMinorista < 0
  ) {
    return NextResponse.json({ error: 'Precios inválidos' }, { status: 400 });
  }

  // ❌ Coherencia de precios
  if (precioLista > precioMayorista) {
    return NextResponse.json(
      { error: 'El precio mayorista no puede ser menor que el precio de lista.' },
      { status: 400 }
    );
  }

  if (precioMayorista > precioMinorista) {
    return NextResponse.json(
      { error: 'El precio minorista no puede ser menor que el mayorista.' },
      { status: 400 }
    );
  }

  // 🔍 Producto anterior
  const productoAnterior = await Product.findById(productId);
  if (!productoAnterior) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  // ✅ Actualizar
  const productoActualizado = await Product.findByIdAndUpdate(
    productId,
    {
      ...body,
      precioLista,
      precioMayorista,
      precioMinorista,
    },
    { new: true }
  );

  if (!productoActualizado) {
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }

  // 🔥 SSE
  notifyProducts({
    type: 'producto_actualizado',
    data: normalizeProduct(productoActualizado),
  });

  return NextResponse.json(productoActualizado, { status: 200 });
}


// 🔹 ELIMINAR PRODUCTO
export async function DELETE(req: NextRequest, { params }: any) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !isAdmin(session.user.role)) {
    return Response.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const deleted = await Product.findByIdAndDelete(params.id);

    if (!deleted) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    notifyProducts({
      type: "producto_eliminado",
      data: deleted,
    });

    return Response.json({ message: "Producto eliminado" });
  } catch (error) {
    return Response.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}
