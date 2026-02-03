import { authOptions } from "@/app/lib/auth";
import connectDB from "@/app/lib/mongoose";
import Product from "@/app/models/Product";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { notifyProducts } from './events/productsNotifier';
import '@/app/models/Proveedor';


connectDB();

// 🔒 Helper: verificar rol admin/superadmin
const isAdmin = (role: string) => ['admin', 'superadmin'].includes(role);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);

    // ✅ NUEVO: verificar si se pide "todos"
    const all = searchParams.get('all') === 'true';

    if (all) {
      // Devuelve TODOS los productos sin paginación
      const products = await Product.find()
        .populate('proveedor')
        .sort({ nombre: 1 });

      return NextResponse.json(
        { products },
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    // Comportamiento original (con paginación)
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments();
    const products = await Product.find()
      .populate('proveedor')
      .sort({ nombre: 1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(
      { products, total, page, totalPages: Math.ceil(total / limit) },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// 👇 POST: crear nuevo producto 
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const data = await req.json();

    // ✅ Validaciones de precios
    // precioLista es opcional - solo validar si existe
    if (data.precioLista != null) {
      if (typeof data.precioLista !== 'number' || data.precioLista < 0) {
        return NextResponse.json({ error: 'Precio de lista inválido (debe ser número ≥ 0 o null)' }, { status: 400 });
      }
    }

    if (typeof data.precioMayorista !== 'number' || data.precioMayorista <= 0) {
      return NextResponse.json({ error: 'Precio mayorista inválido (debe ser número > 0)' }, { status: 400 });
    }


    // ✅ Precio de oferta es opcional
    if (data.precioOferta != null) {
      if (typeof data.precioOferta !== 'number' || data.precioOferta < 0) {
        return NextResponse.json({ error: 'Precio de oferta inválido (debe ser número ≥ 0 o null)' }, { status: 400 });
      }
    }

    // ✅ Validar campos obligatorios básicos
    if (!data.nombre || !data.categoria) {
      return NextResponse.json({ error: 'Nombre y categoría son obligatorios' }, { status: 400 });
    }

    // ✅ Validar stock
    if (!Array.isArray(data.stock) || data.stock.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un depósito con stock' }, { status: 400 });
    }
    for (const s of data.stock) {
      if (!s.deposito || typeof s.cantidad !== 'number' || s.cantidad <= 0) {
        return NextResponse.json({ error: 'Cada depósito debe tener nombre y cantidad > 0' }, { status: 400 });
      }
    }

    // ✅ Validar lotes (si se envían)
    if (data.lotes) {
      if (!Array.isArray(data.lotes)) {
        return NextResponse.json({ error: 'Lotes debe ser un arreglo' }, { status: 400 });
      }
      for (const l of data.lotes) {
        if (l.lote || l.vencimiento || l.deposito || (l.cantidad && l.cantidad > 0)) {
          if (!l.lote || !l.vencimiento || !l.deposito || !l.cantidad || l.cantidad <= 0) {
            return NextResponse.json({ error: 'Lote incompleto: se requieren lote, vencimiento, depósito y cantidad > 0' }, { status: 400 });
          }
          if (new Date(l.vencimiento) <= new Date()) {
            return NextResponse.json({ error: 'La fecha de vencimiento debe ser futura' }, { status: 400 });
          }
        }
      }
    }

    const productData = {
      nombre: data.nombre.trim(),
      categoria: data.categoria.trim(),
      unidad: data.unidad || 'kg',
      cantidadUnidad: Number(data.cantidadUnidad) || 1,
      precioLista: data.precioLista,
      precioMayorista: data.precioMayorista,
      precioOferta: data.precioOferta ?? null,
      stock: data.stock,
      lotes: data.lotes || [],
      imagen: data.imagen || null,
    };

    const product = new Product(productData);
    await product.save();

    // ⬅️ **ENVIAR EVENTO SSE**
    notifyProducts({
      type: 'producto_creado',
      data: product,
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

    // ✅ Asegurar que siempre devuelva un mensaje legible
    return NextResponse.json(
      { error: error.message || 'Error inesperado al crear el producto' },
      { status: 500 }
    );
  }
}