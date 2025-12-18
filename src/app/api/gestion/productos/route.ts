import { authOptions } from "@/app/lib/auth";
import connectDB from "@/app/lib/mongoose";
import Product from "@/app/models/Product";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse, NextResponse as Response } from "next/server";
import { notifyProducts } from './events/productsNotifier';


connectDB();

// 🔒 Helper: verificar rol admin/superadmin
const isAdmin = (role: string) => ['admin', 'superadmin'].includes(role);


export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdmin(session.user.role)) {
    return Response.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments();
    const products = await Product.find()
      .sort({ nombre: 1 })
      .skip(skip)
      .limit(limit);

    return Response.json(
      { products, total, page, totalPages: Math.ceil(total / limit) },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}




// 👇 POST: crear nuevo producto 
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const data = await req.json();

  

    if (typeof data.precioLista !== 'number' || data.precioLista < 0) {
      return NextResponse.json({ error: 'Precio de lista inválido' }, { status: 400 });
    }

    if (typeof data.precioMayorista !== 'number' || data.precioMayorista < 0) {
      return NextResponse.json({ error: 'Precio mayorista inválido' }, { status: 400 });
    }
    if (typeof data.precioMinorista !== 'number' || data.precioMinorista < 0) {
      return NextResponse.json({ error: 'Precio minorista inválido' }, { status: 400 });
    }

    const productData = {
      nombre: data.nombre,
      categoria: data.categoria,
      unidad: data.unidad,
      cantidadUnidad: Number(data.cantidadUnidad),
      precioLista: data.precioLista,
      precioMayorista: data.precioMayorista,
      precioMinorista: data.precioMinorista,
      stock: data.stock || [],
      lotes: data.lotes || [],
      imagen: data.imagen || null,
    };

    const product = new Product(productData);
    await product.save();

    // ⬅️ **ENVIAR EVENTO SSE A TODOS LOS CLIENTES**
    notifyProducts({
      type: 'producto_creado',
      data: product
    });

    return NextResponse.json(product, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear producto:', error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Ya existe un producto con ese nombre y categoría.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Error al crear producto' },
      { status: 400 }
    );
  }
}
