import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import connectDB from '@/app/lib/mongoose';
import User from '@/app/models/User';

connectDB();



// Inicio de Sesión
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
   // console.log('BACKEND - Request Body:', body); 

    const { email, password } = body;
    //console.log( "back", email, password   )

    if (!email || !password) {
      return NextResponse.json({ message: 'Correo y contraseña son requeridos' }, { status: 400 });
    }

    // Buscar el usuario
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ message: 'Correo o contraseña incorrectos' }, { status: 400 });
    }

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Correo o contraseña incorrectos' }, { status: 400 });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    

    return NextResponse.json({ message: 'Inicio de sesión exitoso', token }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error); // Log any errors
    return NextResponse.json({ message: 'Error en el servidor' }, { status: 500 });
  }


  
}