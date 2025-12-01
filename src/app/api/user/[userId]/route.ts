import connectDB from '@/app/lib/mongoose';
import User from '@/app/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;


  
    //console.log('ID de usuario recibido:', userId);
  
    // Verificar si el userId es un ObjectId válido de MongoDB
    if (!ObjectId.isValid(userId)) {
      console.warn('ID de usuario no válido:', userId);
      return NextResponse.json({ message: 'ID de usuario no válido' }, { status: 400 });
    }
  
    // Conectar a la base de datos
    await connectDB();
  
    try {
      // Buscamos el usuario por su ID, sin incluir la contraseña
      const user = await User.findById(userId).select('-password');
      if (!user) {
        console.warn('Usuario no encontrado con ID:', userId);
        return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
      }
      //console.log('Usuario encontrado:', user);
      return NextResponse.json(user, { status: 200 });
    } catch (error) {
      console.error('Error al obtener el usuario:', error);
      return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
    }
  }
  