// app/api/gestion/productos/[id]/route.ts
import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';
import { authOptions } from '@/app/lib/auth';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { notifyProducts } from '../events/productsNotifier';




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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const body = await request.json();
  const productId = (await params).id;

  // Obtener estado anterior
  const productoAnterior = await Product.findById(productId);
  if (!productoAnterior) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  // Actualizar
  const productoActualizado = await Product.findByIdAndUpdate(productId, body, {
    new: true,
  });
  if (!productoActualizado) {
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }

  // Función para calcular stock total
  const calcularStockTotal = (p: any): number => {
    if (Array.isArray(p.lotes)) {
      return p.lotes.reduce((sum: number, lote: any) => sum + (lote.cantidad || 0), 0);
    }
    return p.stock || 0;
  };

  const stockAnterior = calcularStockTotal(productoAnterior);
  const stockNuevo = calcularStockTotal(productoActualizado);

  // 🔴 IMPORTANTE: Notificar a los clientes SSE
  notifyProducts({
    type: "producto_actualizado",
    data: {
      _id: productoActualizado._id,
      precioMayorista: productoActualizado.precioMayorista,
      precioMinorista: productoActualizado.precioMinorista,
      stock: stockNuevo,
      activo: productoActualizado.activo,
    }
  });

  return NextResponse.json(productoActualizado, { status: 200 });
}


// PATCH y DELETE pueden implementarse de forma similar si afectan stock.
// Por ahora, solo PUT está habilitado para cambios de stock.

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
