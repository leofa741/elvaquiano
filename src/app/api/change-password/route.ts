// app/api/change-password/route.ts
import { NextResponse } from 'next/server';

import bcrypt from 'bcryptjs'; // Para hashear la contraseña
import User from '@/app/models/User';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: 'Token y contraseña son requeridos.' },
        { status: 400 }
      );
    }

    // Busca al usuario por el token y verifica que no haya expirado
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Verifica que el token no haya expirado
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Token inválido o expirado.' },
        { status: 400 }
      );
    }

    // Hashea la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualiza la contraseña del usuario y borra el token
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: 'Error al actualizar la contraseña.' },

      
      { status: 500 }
    );
  }
}