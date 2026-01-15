import { NextRequest, NextResponse } from 'next/server';


import jwt from 'jsonwebtoken';
import cloudinary from '@/app/lib/cloudinary';
import User from '@/app/models/User';
import connectDB from '@/app/lib/mongoose';

interface DecodedToken {
  id: string;
  role: string;
}

interface CloudinaryUploadResult {
  secure_url: string;
}

connectDB();

function getTokenFromRequest(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.split(' ')[1] || null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Acceso no autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      // Si viene id, buscar un usuario
      const user = await User.findById(id).select('-password');
      if (!user) {
        return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
      }
      return NextResponse.json(user);
    }

    // Si no hay id, devolver todos
    const users = await User.find().select('-password');
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error en GET:', error);
    return NextResponse.json({ message: 'Error al obtener los usuarios intente salir y volver a entrar ' }, { status: 500 });
  }
}

// ✅ PUT - Actualizar un usuario (solo admin)
export async function PUT(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'ID de usuario requerido' }, { status: 400 });

    const formData = await req.formData();
    const name = formData.get('name')?.toString().trim() || '';
    const lastName = formData.get('lastName')?.toString().trim() || '';
    const address = formData.get('address')?.toString().trim() || '';   // ✅
    const city = formData.get('city')?.toString().trim() || '';         // ✅
    const zipCode = formData.get('zipCode')?.toString().trim() || '';   // ✅
    const phone = formData.get('phone')?.toString().trim() || '';
    const role = formData.get('role')?.toString().trim() || '';
    const imgFile = formData.get('img') as File | null;

    let imgUrl = null;
    if (imgFile && imgFile.size > 0) {
      const arrayBuffer = await imgFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: 'image', folder: 'users' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        ).end(buffer);
      });
      imgUrl = (result as CloudinaryUploadResult).secure_url;
    }

    // ✅ Incluir TODOS los campos que se deben actualizar
    const updateData: any = {
      name,
      lastName,
      address,      // ✅
      city,         // ✅
      zipCode,      // ✅
      phone,
      role,
    };

    if (imgUrl) {
      updateData.img = imgUrl;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error en PUT:', error);
    return NextResponse.json({ message: 'Error al actualizar el usuario' }, { status: 500 });
  }
}
// ✅ DELETE - Eliminar un usuario (solo admin)
export async function DELETE(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });

    return NextResponse.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error en DELETE:', error);
    return NextResponse.json({ message: 'Error al eliminar el usuario' }, { status: 500 });
  }
}
