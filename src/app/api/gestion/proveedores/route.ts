// app/api/gestion/proveedores/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/app/lib/mongoose';
import Proveedor from '@/app/models/Proveedor';
import { authOptions } from '@/app/lib/auth';


export async function GET(request: NextRequest) {
  await connectDB();

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') as string) || 20;
    const page = parseInt(searchParams.get('page') as string) || 1;
    const skip = (page - 1) * limit;

    const proveedores = await Proveedor.find()

      .sort({ nombre: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Proveedor.countDocuments();



    return new Response(
      JSON.stringify({
        proveedores,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await connectDB();

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const body = await request.json();
  
    const { nombre, telefono, email } = body;

    if (!nombre?.trim()) {
      return new Response(JSON.stringify({ error: 'Nombre es obligatorio' }), { status: 400 });
    }

    // Evitar duplicados por nombre (case-insensitive)
    const existe = await Proveedor.findOne({
      nombre: { $regex: new RegExp(`^${nombre.trim()}$`, 'i') },
    });
    if (existe) {
      return new Response(
        JSON.stringify({ error: 'Ya existe un proveedor con ese nombre' }),
        { status: 409 }
      );
    }

    const nuevoProveedor = new Proveedor({
      nombre: nombre.trim(),
      telefono: telefono?.trim() || undefined,
      email: email?.trim() || undefined,

    });
  

    await nuevoProveedor.save();

    return new Response(JSON.stringify(nuevoProveedor), { status: 201 });
  } catch (error: any) {
    console.error('Error al crear proveedor:', error);
    if (error.code === 11000) {
      return new Response(JSON.stringify({ error: 'Proveedor duplicado' }), { status: 409 });
    }
    return new Response(JSON.stringify({ error: 'Error al crear proveedor' }), { status: 500 });
  }
}