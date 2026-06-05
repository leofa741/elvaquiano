// app/api/gestion/productos/[id]/route.ts
import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';
import Presupuesto from '@/app/models/Presupuesto';
import { authOptions } from '@/app/lib/auth';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { notifyProducts } from '../events/productsNotifier';
import { normalizeProduct } from '../events/productsNotifier';
import LogStockModel from '@/app/models/LogStock'; // ✅ NUEVO

connectDB();

const isAdmin = (role: string) => ['admin', 'superadmin'].includes(role);

// GET: obtener producto por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const producto = await Product.findById(id);
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT: actualizar producto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  // ✅ 1. Manejo seguro del cuerpo de la solicitud
  let body;
  try {
    body = await request.json();
  } catch (parseError) {
    console.error('Error al parsear JSON en PUT producto:', parseError);
    return NextResponse.json({ error: 'Formato JSON inválido en la solicitud' }, { status: 400 });
  }

  // ✅ 2. Verificar existencia
  const productoExistente = await Product.findById(id);
  if (!productoExistente) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  // ✅ 3. Capturar stock ANTES del cambio (para auditoría)
  const stockAnterior = productoExistente.stock.map((s: { deposito: string; cantidad: number }) => ({
    deposito: s.deposito,
    cantidad: s.cantidad
  }));
  const stockTotalAnterior = stockAnterior.reduce((sum : number, s: { deposito: string; cantidad: number }) => sum + s.cantidad, 0);

  // ✅ 4. Determinar si es actualización parcial
  const camposFormularioCompleto = ['nombre', 'categoria', 'precioLista', 'precioMayorista', 'stock'];
  const esParcial = !camposFormularioCompleto.every(campo => campo in body);

  let updateData: Record<string, any> = {};

  // 👇 NUEVO: Manejo del campo `proveedor` (en ambos modos)
  if ('proveedor' in body) {
    const provValue = body.proveedor;
    if (provValue === null || provValue === '' || provValue === undefined) {
      updateData.proveedor = null;
    } else if (typeof provValue === 'string') {
      const Proveedor = (await import('@/app/models/Proveedor')).default;
      const existe = await Proveedor.findById(provValue);
      if (!existe) {
        return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 400 });
      }
      updateData.proveedor = provValue;
    } else {
      return NextResponse.json({ error: 'Proveedor debe ser un ID válido o null' }, { status: 400 });
    }
  }

  if (esParcial) {
    // ✅ Actualización parcial: solo permitir campos específicos
    if ('activo' in body) updateData.activo = Boolean(body.activo);
    if ('lotes' in body) {
      if (!Array.isArray(body.lotes)) {
        return NextResponse.json({ error: 'Lotes debe ser un arreglo' }, { status: 400 });
      }
      updateData.lotes = body.lotes;
    }
    if ('stockMinimoAlerta' in body) {
      const valor = body.stockMinimoAlerta;
      if (valor === null || valor === '' || valor === undefined) {
        updateData.$unset = { stockMinimoAlerta: '' };
      } else {
        const num = Number(valor);
        if (isNaN(num) || num < 0) {
          return NextResponse.json({ error: 'stockMinimoAlerta debe ser un número ≥ 0 o null' }, { status: 400 });
        }
        updateData.stockMinimoAlerta = num;
      }
    }

    if ('stock' in body) {
      if (!Array.isArray(body.stock)) {
        return NextResponse.json({ error: 'Stock debe ser un arreglo' }, { status: 400 });
      }

      updateData.stock = body.stock.map((s: any) => ({
        deposito: s.deposito,
        cantidad: Number(s.cantidad) || 0
      }));
    }

    if ('stockReservado' in body) {
      updateData.stockReservado = Number(body.stockReservado) || 0;
    }

  } else {
    // ✅ Actualización completa
    const { nombre, categoria, unidad, cantidadUnidad, stock, lotes } = body;

    if (!nombre || !categoria) {
      return NextResponse.json({ error: 'Nombre y categoría son obligatorios' }, { status: 400 });
    }

    const precioLista = body.precioLista;
    const precioMayorista = body.precioMayorista;
    const precioOferta = body.precioOferta;

    if (precioLista != null) {
      if (typeof precioLista !== 'number' || precioLista < 0) {
        return NextResponse.json({ error: 'Precio de lista inválido (debe ser número ≥ 0 o null)' }, { status: 400 });
      }
    }

    if (typeof precioMayorista !== 'number' || precioMayorista <= 0) {
      return NextResponse.json({ error: 'Precio mayorista inválido (debe ser número > 0)' }, { status: 400 });
    }
    if (precioOferta != null && (typeof precioOferta !== 'number' || precioOferta < 0)) {
      return NextResponse.json({ error: 'Precio de oferta inválido (debe ser número ≥ 0 o null)' }, { status: 400 });
    }
    if (precioLista > precioMayorista) {
      return NextResponse.json({ error: 'El precio mayorista no puede ser menor que el precio de lista.' }, { status: 400 });
    }

    if (!Array.isArray(stock) || stock.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un depósito con stock' }, { status: 400 });
    }
    for (const s of stock) {
      if (!s.deposito || typeof s.cantidad !== 'number' || s.cantidad <= 0) {
        return NextResponse.json({ error: 'Cada depósito debe tener nombre y cantidad > 0' }, { status: 400 });
      }
    }

    if (lotes) {
      if (!Array.isArray(lotes)) {
        return NextResponse.json({ error: 'Lotes debe ser un arreglo' }, { status: 400 });
      }
      for (const l of lotes) {
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

    updateData = {
      nombre: String(nombre).trim(),
      categoria: String(categoria).trim(),
      unidad: unidad || 'kg',
      cantidadUnidad: Number(cantidadUnidad) || 1,
      precioLista,
      precioMayorista,
      precioOferta: precioOferta ?? null,
      stock,
      lotes: lotes || [],
      imagen: body.imagen || productoExistente.imagen,
    };
  }

  try {
    // 👇 IMPORTANTE: Poblar el proveedor al devolver
    const productoActualizado = await Product.findByIdAndUpdate(id, updateData, { new: true })
      .populate('proveedor');

    if (!productoActualizado) {
      return NextResponse.json({ error: 'No se pudo actualizar el producto' }, { status: 500 });
    }

    // ✅ NUEVO: Registrar cambio de stock en bitácora
    if ('stock' in body) {
      const stockNuevo = productoActualizado.stock.map((s: { deposito: string; cantidad: number }) => ({
        deposito: s.deposito,
        cantidad: s.cantidad
      }));
      const stockTotalNuevo = stockNuevo.reduce((sum : number, s: { deposito: string; cantidad: number }) => sum + s.cantidad, 0);

      // Determinar tipo de acción
      let accion = 'otro';
      if (stockTotalNuevo === 0 && stockTotalAnterior > 0) {
        accion = 'resetear_cero';
      } else if (stockTotalAnterior !== stockTotalNuevo) {
        // Verificar si todos los depósitos tienen la misma cantidad (cantidad personalizada)
        const cantidadesUnicas: number[] = Array.from(
          new Set<number>(stockNuevo.map((s: { deposito: string; cantidad: number }) => s.cantidad))
        );
        if (cantidadesUnicas.length === 1 && cantidadesUnicas[0] > 0) {
          accion = 'cantidad_personalizada';
        } else {
          accion = 'edicion_manual';
        }
      }

      // Solo registrar si hubo cambio real en el stock
      if (JSON.stringify(stockAnterior) !== JSON.stringify(stockNuevo)) {
        try {
          await LogStockModel.create({
            usuario: session.user.email,
            productoId: productoActualizado._id.toString(),
            productoNombre: productoActualizado.nombre,
            stockAnterior,
            stockNuevo,
            stockTotalAnterior,
            stockTotalNuevo,
            accion
          });
          console.log(`📝 Log de stock registrado: ${accion} por ${session.user.email}`);
        } catch (logError) {
          console.error('⚠️ Error al registrar log de stock:', logError);
          // No bloqueamos la respuesta si falla el log
        }
      }
    }

    // ✅ NUEVO: Actualizar precios en presupuestos existentes
    try {
      // Buscar todos los presupuestos que contengan este producto
      const presupuestosConProducto = await Presupuesto.find({
        'productos.producto': id,
        activo: true
      });

      if (presupuestosConProducto.length > 0) {
        console.log(`📝 Actualizando precios en ${presupuestosConProducto.length} presupuestos...`);

        // Actualizar cada presupuesto
        for (const presupuesto of presupuestosConProducto) {
          let totalActualizado = 0;
          let presupuestoModificado = false;

          // Recorrer los productos del presupuesto
          for (const item of presupuesto.productos) {
            if (item.producto.toString() === id) {
              // Actualizar precio según el tipoPrecio
              const nuevoPrecio = item.tipoPrecio === 'mayorista' 
                ? productoActualizado.precioMayorista 
                : productoActualizado.precioOferta ?? productoActualizado.precioMayorista;

              // Solo actualizar si el precio cambió
              if (item.precioAplicado !== nuevoPrecio) {
                item.precioAplicado = nuevoPrecio;
                item.subtotal = nuevoPrecio * item.cantidad;
                presupuestoModificado = true;
              }
            }
            totalActualizado += item.subtotal;
          }

          // Si se modificó algún precio, actualizar el presupuesto
          if (presupuestoModificado) {
            presupuesto.total = totalActualizado;
            await presupuesto.save();
            console.log(`✅ Presupuesto ${presupuesto._id} actualizado`);
          }
        }
      }
    } catch (error) {
      // Si falla la actualización de presupuestos, no bloqueamos la respuesta
      console.error('⚠️ Error al actualizar presupuestos:', error);
      // Continuamos con la respuesta exitosa del producto
    }

    notifyProducts({
      type: 'producto_actualizado',
      data: normalizeProduct(productoActualizado),
    });

    return NextResponse.json(productoActualizado);
  } catch (error: any) {
    console.error('Error al actualizar producto:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Ya existe un producto con ese nombre y categoría.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al guardar los cambios' }, { status: 500 });
  }
}

// DELETE: eliminar producto
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    notifyProducts({
      type: "producto_eliminado",
      data: deleted,
    });

    return NextResponse.json({ message: "Producto eliminado" });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}