// app/api/gestion/presupuestos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Presupuesto from '@/app/models/Presupuesto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { Types } from 'mongoose';

connectDB();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const presupuesto = await Presupuesto.findById(id)
      .populate('cliente', 'razonSocial direccion telefono email') 
      .lean();

  if (!presupuesto) {
    return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
  }

  return NextResponse.json(presupuesto, { status: 200 });
}


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const eliminado = await Presupuesto.findByIdAndDelete(id);

    if (!eliminado) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Presupuesto eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar presupuesto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}