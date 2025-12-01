// app/api/profile/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import User from '@/app/models/User';
import connectDB from '@/app/lib/mongoose';

connectDB();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const user = await User.findById(session.user.id).select('-password');
    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error en GET /api/profile:', error);
    return NextResponse.json({ message: 'Error al obtener el perfil' }, { status: 500 });
  }
}
