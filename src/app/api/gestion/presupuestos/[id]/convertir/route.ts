// app/api/gestion/presupuestos/[id]/convertir/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Pedido from '@/app/models/Pedido';
import Presupuesto from '@/app/models/Presupuesto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = await params; // ✅ Forma correcta de obtener el ID

    const presupuesto = await Presupuesto.findById(id);
    if (!presupuesto) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado' },
        { status: 404 }
      );
    }

    if (presupuesto.estado === 'convertido') {
      return NextResponse.json(
        { error: 'Este presupuesto ya fue convertido' },
        { status: 400 }
      );
    }

    const nuevoPedido = new Pedido({
      cliente: presupuesto.cliente,
      productos: presupuesto.productos,
      deposito: presupuesto.productos[0]?.deposito || 'principal',
      total: presupuesto.total,
      estado: 'pendiente',
      origen: presupuesto.origen || 'mostrador',
    });

    const pedidoGuardado = await nuevoPedido.save();

    presupuesto.pedidoAsociado = pedidoGuardado._id;
    presupuesto.estado = 'convertido';
    await presupuesto.save();

    return NextResponse.json(
      {
        message: 'Presupuesto convertido a pedido',
        pedidoId: pedidoGuardado._id.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al convertir presupuesto:', error);
    return NextResponse.json(
      { error: 'Error interno al convertir el presupuesto' },
      { status: 500 }
    );
  }
}