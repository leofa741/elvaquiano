// app/api/reset-password/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import connectDB from '@/app/lib/mongoose';
import User from '@/app/models/User'; // Asegúrate de importar tu modelo de usuario

connectDB();


// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
    service: process.env.MAILER_SERVICE,
    auth: {
        user: process.env.MAILER_EMAIL,
        pass: process.env.MAILER_SECRET_KEY,
    },
});



// Función para encontrar un usuario por su correo real
async function findUserByEmail(email: string) {
    try {
        const user = await User.findOne({ email }); // Busca el usuario por correo
        if (!user) return null; // Retorna null si no se encuentra el usuario
        return user; // Retorna el usuario encontrado
    } catch (error) {
        console.error('Error al buscar el usuario:', error);
        throw new Error('Error al buscar el usuario en la base de datos.');
    }
}


// Función para guardar el token en la base de datos
async function saveResetToken(userId: string, token: string) {
    try {
        const expirationTime = Date.now() + 3600000; // 1 hora de expiración
        await User.findByIdAndUpdate(userId, {
            resetPasswordToken: token,
            resetPasswordExpires: expirationTime,
        });
    } catch (error) {
        console.error('Error al guardar el token:', error);
        throw new Error('Error al guardar el token en la base de datos.');
    }
}

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, message: 'Correo electrónico es requerido.' },
                { status: 400 }
            );
        }

        // Busca al usuario en la base de datos
        const user = await findUserByEmail(email);
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Usuario no encontrado.' },
                { status: 404 }
            );
        }

        // Genera un token único
        const token = crypto.randomBytes(32).toString('hex');
    
        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/change-password?token=${token}`;

        // Guarda el token en la base de datos (con expiración, si es necesario)
        await saveResetToken(user.id, token);

        // Envía el correo de recuperación
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Recuperación de Contraseña',
            text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${resetLink}`,
            html: `<p>Haz clic <a href="${resetLink}">aquí</a> para restablecer tu contraseña.</p>`,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, message: 'Error al enviar el correo.' },
            { status: 500 }
        );
    }
}