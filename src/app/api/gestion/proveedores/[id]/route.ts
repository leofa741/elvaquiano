import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongoose';
import Proveedor from '@/app/models/Proveedor';
import { authOptions } from '@/app/lib/auth';



export async function PUT(
  request: NextRequest,
  { params }: { params: any }
)  {
  await connectDB();

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { nombre, telefono, email } = await request.json();

    const proveedor = await Proveedor.findById(params.id);
    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    if (nombre !== undefined) proveedor.nombre = nombre.trim();
    proveedor.telefono = telefono?.trim() || undefined;
    proveedor.email = email?.trim() || undefined;

    await proveedor.save();

    return NextResponse.json(proveedor);
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    return NextResponse.json(
      { error: 'Error al actualizar proveedor' },
      { status: 500 }
    );
  }
}
