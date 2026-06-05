import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import connectDB from '@/app/lib/mongoose';
import LogStockModel from '@/app/models/LogStock';

connectDB();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const producto = searchParams.get('producto') || '';
    const usuario = searchParams.get('usuario') || '';
    const accion = searchParams.get('accion') || '';

    const query: any = {};
    
    if (producto) {
      query.productoNombre = { $regex: producto, $options: 'i' };
    }
    
    if (usuario) {
      query.usuario = { $regex: usuario, $options: 'i' };
    }
    
    if (accion) {
      query.accion = accion;
    }

    const total = await LogStockModel.countDocuments(query);
    const logs = await LogStockModel.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error al obtener logs de stock:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}