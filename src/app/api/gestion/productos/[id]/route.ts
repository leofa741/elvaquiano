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


// PUT: actualizar producto (acepta actualizaciones parciales)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const body = await request.json();
  const productId = id;

  // 🔍 Verificar que el producto existe
  const productoExistente = await Product.findById(productId);
  if (!productoExistente) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  // 🧠 Determinar si es una actualización PARCIAL o COMPLETA
  const esParcial = !('nombre' in body); // Si no se envía 'nombre', asumimos parcial

  let updateData: any = {};

  if (esParcial) {
    // ✅ Actualización parcial: solo campos específicos
    if (body.activo !== undefined) updateData.activo = body.activo;
    if (body.lotes !== undefined) updateData.lotes = body.lotes;

    // ✅ Manejo seguro de stockMinimoAlerta
    if (body.stockMinimoAlerta !== undefined) {
      if (body.stockMinimoAlerta === null || body.stockMinimoAlerta === '') {
        updateData.stockMinimoAlerta = undefined; // elimina el campo
      } else {
        const valor = Number(body.stockMinimoAlerta);
        if (!isNaN(valor) && valor >= 0) {
          updateData.stockMinimoAlerta = valor;
        }
        // Si es NaN o negativo, simplemente no lo incluimos
      }
    }
  } else {
    // 🔒 Actualización completa: validar TODO
    const precioLista = Number(body.precioLista);
    const precioMayorista = Number(body.precioMayorista);
    const precioMinorista = Number(body.precioMinorista);
    const precioOferta = Number(body.precioOferta);

    if (
      Number.isNaN(precioLista) ||
      Number.isNaN(precioMayorista) ||
      Number.isNaN(precioMinorista) ||
      Number.isNaN(precioOferta) ||
      precioLista < 0 ||
      precioMayorista < 0 ||
      precioMinorista < 0 ||
      precioOferta < 0
    ) {
      return NextResponse.json({ error: 'Precios inválidos' }, { status: 400 });
    }

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

    updateData = {
      ...body,
      precioLista,
      precioMayorista,
      precioMinorista,
      precioOferta,
    };
  }

  const productoActualizado = await Product.findByIdAndUpdate(
    productId,
    updateData,
    { new: true }
  );

  if (!productoActualizado) {
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }

  notifyProducts({
    type: 'producto_actualizado',
    data: normalizeProduct(productoActualizado),
  });

  return NextResponse.json(productoActualizado, { status: 200 });
}

// 🔹 ELIMINAR PRODUCTO
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ✅
  const session = await getServerSession(authOptions);

  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const deleted = await Product.findByIdAndDelete(id); // ✅ usa id

    if (!deleted) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    notifyProducts({
      type: "producto_eliminado",
      data: deleted,
    });

    return NextResponse.json({ message: "Producto eliminado" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}