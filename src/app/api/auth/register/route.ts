import { NextRequest, NextResponse } from 'next/server';

import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongoose';
import User from '@/app/models/User';

connectDB();

// Registro de Usuario
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  try {
    // Validar que el correo no esté registrado
    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json({ message: 'El correo ya está registrado' }, { status: 400 });
    }

    // Crear el usuario
    const newUser = new User({ email, password });
    await newUser.save();

    // Generar token JWT
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    return NextResponse.json({ message: 'Usuario registrado', token }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error en el servidor' }, { status: 500 });
  }
}
