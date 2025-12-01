import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/app/models/User';
import connectDB from '@/app/lib/mongoose';

interface DecodedToken {
    id: string;
}

connectDB();

function getTokenFromRequest(req: NextRequest): string | null {
    return req.headers.get('Authorization')?.split(' ')[1] || null;
}

export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            console.error('No se proporcionó un token JWT.');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
        } catch (error) {
            console.error('Error al decodificar el token:', error);
            return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
        }

        const userId = decoded.id;

        //console.log('ID de usuario decodificado:', userId);

        const body = await req.json();
        //console.log('Datos recibidos del frontend:', body);

        const { name, lastName ,address, city, zipCode, phone } = body;

        if (!name || !lastName || !address || !city || !zipCode || !phone) {
            console.error('Faltan campos obligatorios en el formulario.');
            return NextResponse.json(
                { error: 'Todos los campos son obligatorios' },
                { status: 400 }
            );
        }

        // Busca al usuario por ID
        const user = await User.findById(userId);
        if (!user) {
            console.error('Usuario no encontrado con ID:', userId);
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            );
        }

        // Actualiza los campos
        user.name = name;
        user.lastName = lastName;
        user.address = address;
        user.city = city;
        user.zipCode = zipCode;
        user.phone = phone;

        //console.log('Datos del usuario antes de guardar:', user);

        user.markModified('name');
        user.markModified('lastName');
        user.markModified('address');
        user.markModified('city');
        user.markModified('zipCode');


        // Guarda los cambios
        await user.save();

        //console.log('Usuario actualizado correctamente:', user);

        return NextResponse.json(
            { message: 'Datos guardados correctamente', user },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error al guardar los datos:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}