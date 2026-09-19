import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import connectDB from '@/app/lib/mongoose';
import mongoose from 'mongoose';
import Cliente from '@/app/models/Cliente';
import Product from '@/app/models/Product';
import LogStockModel from '@/app/models/LogStock';

connectDB();

const isAdminOrVendedor = (role: string) => ['admin', 'superadmin', 'vendedor'].includes(role);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminOrVendedor(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const { producto, fechaInicio, fechaFin } = await req.json();

    if (!producto || !fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const db = mongoose.connection.db;
    if (!db) throw new Error('No hay conexión a la base de datos');

    const start = new Date(fechaInicio + 'T00:00:00.000Z');
    const end = new Date(fechaFin + 'T23:59:59.999Z');

    // 1. AGGREGATION: Pedidos en preparación con el producto
    const pipeline = [
      { $match: { estado: 'preparacion', createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$productos' },
      { $match: { 'productos.nombre': { $regex: producto, $options: 'i' } } },
      { 
        $group: { 
          _id: '$cliente', 
          cantidadTotal: { $sum: '$productos.cantidad' }, 
          pedidos: { $sum: 1 } 
        } 
      }
    ];

    const resultadosPedidos = await db.collection('pedidos').aggregate(pipeline).toArray();
    const totalUnidadesPreparacion = resultadosPedidos.reduce((acc: number, r: any) => acc + (r.cantidadTotal || 0), 0);
    const totalPedidosPreparacion = resultadosPedidos.reduce((acc: number, r: any) => acc + (r.pedidos || 0), 0);

    // 1.5 DETALLE DE PEDIDOS (NUEVO: Para cruzar con huecos de tiempo)
    const pedidosDetalle = await db.collection('pedidos').aggregate([
      { $match: { estado: 'preparacion', createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$productos' },
      { $match: { 'productos.nombre': { $regex: producto, $options: 'i' } } },
      { $project: { fecha: '$createdAt', cantidad: '$productos.cantidad', cliente: '$cliente' } }
    ]).toArray();

    // 2. TRAER NOMBRES DE LOS CLIENTES
    const clientesIds = resultadosPedidos.map((r: any) => String(r._id));
    const clientes = await Cliente.find(
      { _id: { $in: clientesIds } },
      { razonSocial: 1, nombre: 1, apellido: 1, telefono: 1 }
    ).lean();

    const clientesMap: Record<string, any> = {};
    clientes.forEach((c: any) => {
      clientesMap[String(c._id)] = {
        nombre: c.razonSocial || `${c.nombre || ''} ${c.apellido || ''}`.trim() || 'Cliente Desconocido',
        telefono: c.telefono || '-'
      };
    });

    const desglose = resultadosPedidos.map((r: any) => ({
      idCliente: String(r._id),
      nombreCliente: clientesMap[String(r._id)]?.nombre || 'Desconocido',
      telefono: clientesMap[String(r._id)]?.telefono || '-',
      cantidadTotal: r.cantidadTotal || 0,
      pedidos: r.pedidos || 0
    }));

    // 3. STOCK ACTUAL DEL PRODUCTO
    const productoDoc = await Product.findOne({ nombre: { $regex: producto, $options: 'i' } }).lean() as any;
    let stockActual = 0;
    let detalleDepositos: { deposito: string; cantidad: number }[] = [];
    
    if (productoDoc && Array.isArray(productoDoc.stock)) {
      productoDoc.stock.forEach((item: any) => {
        stockActual += Number(item.cantidad) || 0;
        detalleDepositos.push({ deposito: item.deposito || 'Sin nombre', cantidad: Number(item.cantidad) || 0 });
      });
    }

    // 4. AUDITORÍA DETALLADA DE STOCK
    const logsStock = await LogStockModel.find({
      productoNombre: { $regex: producto, $options: 'i' },
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: 1 }).lean() as any[];

    let stockInicialExacto = stockActual;
    let totalIngresadoPeriodo = 0;
    let totalEgresadoPeriodo = 0;
    const movimientosDetalle = [];

    for (const log of logsStock) {
      const cambio = (log.stockTotalNuevo || 0) - (log.stockTotalAnterior || 0);
      stockInicialExacto -= cambio; 

      if (cambio > 0) totalIngresadoPeriodo += cambio;
      else totalEgresadoPeriodo += Math.abs(cambio);

      movimientosDetalle.push({
        fecha: log.timestamp,
        usuario: log.usuario || 'Sistema',
        accion: log.accion,
        anterior: log.stockTotalAnterior,
        nuevo: log.stockTotalNuevo,
        diferencia: cambio
      });
    }

    return NextResponse.json({
      producto,
      fechaInicio,
      fechaFin,
      totalPedidosPreparacion,
      totalUnidadesPreparacion,
      desglose,
      pedidosDetalle: pedidosDetalle.map((p: any) => ({
        fecha: p.fecha,
        cantidad: p.cantidad || 0,
        clienteId: String(p.cliente)
      })), // <--- NUEVO: Enviamos esto al frontend
      stock: {
        actual: stockActual,
        inicialExacto: Math.max(0, stockInicialExacto),
        detalleDepositos,
        auditoria: {
          totalIngresado: totalIngresadoPeriodo,
          totalEgresado: totalEgresadoPeriodo,
          movimientos: movimientosDetalle
        }
      }
    });

  } catch (error: any) {
    console.error('Error en análisis de stock:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}