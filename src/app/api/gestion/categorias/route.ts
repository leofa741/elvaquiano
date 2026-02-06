// app/api/gestion/categorias/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '@/app/models/Product';

// ========================================
// GET: Obtener categorías (con contador)
// ========================================
// ========================================
// GET: Obtener categorías (con contador)
// ========================================
export async function GET(request: NextRequest) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const { searchParams } = new URL(request.url);
    const includeCount = searchParams.get('includeCount') === 'true';

    // Obtener categorías únicas de productos activos (filtrando null/undefined)
    const categoriasRaw = await Product.distinct('categoria', { 
      activo: true,
      categoria: { $exists: true, $nin: [null, ''] }
    });

    // Filtrar categorías válidas
    const categorias = categoriasRaw.filter(cat => 
      cat && typeof cat === 'string' && cat.trim().length > 0
    );

    if (includeCount) {
      // Contar productos por categoría
      const categoriasConCount = await Promise.all(
        categorias.map(async (categoria: string) => {
          const count = await Product.countDocuments({
            categoria: categoria.trim(),
            activo: true,
          });
          return { 
            nombre: categoria.trim(), 
            productoCount: count 
          };
        })
      );
      
      // Filtrar categorías con productos o mantener todas
      const categoriasFiltradas = categoriasConCount.filter(cat => 
        cat.productoCount > 0 || categorias.includes(cat.nombre)
      );
      
      return NextResponse.json(
        categoriasFiltradas.sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
    }

    return NextResponse.json(categorias.sort());
  } catch (error) {
    console.error('❌ Error al obtener categorías:', error);
    return NextResponse.json({ 
      error: 'Error al obtener categorías',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// ========================================
// POST: Crear nueva categoría
// ========================================
// ❌ BORRAR o MODIFICAR este bloque en /api/gestion/categorias/route.ts
export async function POST(request: NextRequest) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const body = await request.json();
    const { nombre } = body;

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre de la categoría es obligatorio' }, { status: 400 });
    }

    const nombreNormalizado = nombre.trim();

    // ✅ REMOVER esta validación - las categorías se crean automáticamente al asignarlas
    // const existe = await Product.exists({ categoria: nombreNormalizado, activo: true });
    // if (existe) {
    //   return NextResponse.json({ error: 'La categoría ya existe' }, { status: 400 });
    // }

    // ✅ Simplemente retornamos la nueva categoría
    return NextResponse.json({ nombre: nombreNormalizado, productoCount: 0 }, { status: 201 });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}

// ========================================
// PUT: Renombrar categoría existente
// ========================================
export async function PUT(request: NextRequest) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const body = await request.json();
    const { categoriaActual, nuevoNombre } = body;

    if (!categoriaActual?.trim() || !nuevoNombre?.trim()) {
      return NextResponse.json({ error: 'Categoría actual y nuevo nombre son obligatorios' }, { status: 400 });
    }

    const categoriaActualNormalizada = categoriaActual.trim();
    const nuevoNombreNormalizado = nuevoNombre.trim();

    // Verificar que la categoría actual exista
    const existeActual = await Product.exists({ categoria: categoriaActualNormalizada, activo: true });
    if (!existeActual) {
      return NextResponse.json({ error: 'La categoría actual no existe' }, { status: 404 });
    }

    // Verificar que el nuevo nombre no esté en uso (y no sea el mismo)
    if (categoriaActualNormalizada.toLowerCase() !== nuevoNombreNormalizado.toLowerCase()) {
      const existeNuevo = await Product.exists({ categoria: nuevoNombreNormalizado, activo: true });
      if (existeNuevo) {
        return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 400 });
      }
    }

    // Actualizar todos los productos que usan esta categoría
    const result = await Product.updateMany(
      { categoria: categoriaActualNormalizada, activo: true },
      { $set: { categoria: nuevoNombreNormalizado } }
    );

    return NextResponse.json({
      success: true,
      message: `Categoría actualizada: ${result.modifiedCount} producto(s) actualizados`,
      categoriaAnterior: categoriaActualNormalizada,
      categoriaNueva: nuevoNombreNormalizado,
      productosActualizados: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 });
  }
}

// ========================================
// DELETE: Eliminar categoría
// ========================================
export async function DELETE(request: NextRequest) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const body = await request.json();
    const { categoria, reasignarA } = body;

    if (!categoria?.trim()) {
      return NextResponse.json({ error: 'El nombre de la categoría es obligatorio' }, { status: 400 });
    }

    const categoriaNormalizada = categoria.trim();

    // Verificar si la categoría existe
    const existe = await Product.exists({ categoria: categoriaNormalizada, activo: true });
    if (!existe) {
      return NextResponse.json({ error: 'La categoría no existe' }, { status: 404 });
    }

    // Contar productos que usan esta categoría
    const productoCount = await Product.countDocuments({
      categoria: categoriaNormalizada,
      activo: true,
    });

    if (productoCount > 0) {
      if (!reasignarA?.trim()) {
        return NextResponse.json(
          {
            error: 'La categoría tiene productos asignados',
            productoCount,
            necesitaReasignar: true,
          },
          { status: 400 }
        );
      }

      const categoriaDestino = reasignarA.trim();

      // Reasignar productos a la nueva categoría
      const reasignarResult = await Product.updateMany(
        { categoria: categoriaNormalizada, activo: true },
        { $set: { categoria: categoriaDestino } }
      );

      return NextResponse.json({
        success: true,
        message: `Categoría eliminada y ${reasignarResult.modifiedCount} producto(s) reasignados a "${categoriaDestino}"`,
        productosReasignados: reasignarResult.modifiedCount,
        categoriaEliminada: categoriaNormalizada,
        categoriaDestino: categoriaDestino,
      });
    }

    // Si no hay productos, simplemente no hay nada que eliminar (las categorías se generan dinámicamente)
    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada (sin productos asignados)',
      categoriaEliminada: categoriaNormalizada,
    });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 });
  }
}


// ========================================
// PATCH: Reasignar productos de una categoría a otra
// ========================================
export async function PATCH(request: NextRequest) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const body = await request.json();
    const { categoriaOrigen, categoriaDestino } = body;

    if (!categoriaOrigen?.trim() || !categoriaDestino?.trim()) {
      return NextResponse.json({ 
        error: 'Categoría origen y destino son obligatorias' 
      }, { status: 400 });
    }

    const origen = categoriaOrigen.trim();
    const destino = categoriaDestino.trim();

    // Verificar que la categoría origen exista
    const existeOrigen = await Product.exists({ categoria: origen, activo: true });
    if (!existeOrigen) {
      return NextResponse.json({ 
        error: 'La categoría origen no existe' 
      }, { status: 404 });
    }

    // Reasignar todos los productos
    const result = await Product.updateMany(
      { categoria: origen, activo: true },
      { $set: { categoria: destino } }
    );

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} producto(s) reasignados de "${origen}" a "${destino}"`,
      productosReasignados: result.modifiedCount,
      categoriaOrigen: origen,
      categoriaDestino: destino,
    });
  } catch (error) {
    console.error('Error al reasignar productos:', error);
    return NextResponse.json({ error: 'Error al reasignar productos' }, { status: 500 });
  }
}