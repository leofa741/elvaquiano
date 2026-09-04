import { authOptions } from "@/app/lib/auth";
import connectDB from "@/app/lib/mongoose";
import Product from "@/app/models/Product";
import Devolucion from "@/app/models/Devolucion"; // ✅ NUEVO IMPORT
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { notifyProducts } from "../productos/events/productsNotifier";

connectDB();

const isAuthorized = (role: string) => ['admin', 'superadmin', 'vendedor'].includes(role);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { tipo, productoId, cantidad, motivo, notas, lote } = body;

    if (!['cliente', 'proveedor'].includes(tipo) || !productoId || !cantidad || Number(cantidad) <= 0 || !motivo) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const product = await Product.findById(productoId);
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

    let stockEntry = product.stock.find((s: any) => s.deposito === 'Principal') || product.stock[0];
    if (!stockEntry) {
      stockEntry = { deposito: 'Principal', cantidad: 0 };
      product.stock.push(stockEntry);
    }

    const cantidadNumerica = Number(cantidad);

    if (tipo === 'cliente') {
      stockEntry.cantidad += cantidadNumerica;
    } else if (tipo === 'proveedor') {
      stockEntry.cantidad -= cantidadNumerica;
      if (lote && motivo === 'Vencimiento') {
        product.lotes = product.lotes.filter((l: any) => l.lote !== lote);
      }
    }

    await product.save();

    // ✅ NUEVO: Guardar el registro en el historial de devoluciones
    await Devolucion.create({
      producto: product._id,
      nombreProducto: product.nombre,
      tipo,
      cantidad: cantidadNumerica,
      motivo,
      lote: lote || undefined,
      notas: notas || undefined,
      usuario: session.user.email || session.user.name || 'Usuario desconocido',
    });

    notifyProducts({
      type: 'stock_modificado',
      data: { 
        producto: product,
        accion: `Devolución ${tipo === 'cliente' ? 'de cliente' : 'a proveedor'}`,
        detalle: `${motivo} - ${cantidadNumerica} ${product.unidad}`
      },
    });

    return NextResponse.json({ message: 'Devolución registrada e historial guardado', producto: product }, { status: 200 });

  } catch (error: any) {
    console.error('Error al procesar devolución:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

// ✅ NUEVO: Endpoint GET para obtener el historial
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    // Obtenemos los últimos 100 movimientos, ordenados del más reciente al más antiguo
    const devoluciones = await Devolucion.find()
      .sort({ fecha: -1 })
      .limit(100)
      .lean(); // .lean() mejora el rendimiento al devolver objetos JS planos

    return NextResponse.json({ devoluciones }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}