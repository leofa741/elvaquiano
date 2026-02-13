// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongoose';
import User from '@/app/models/User';
import Cliente from '@/app/models/Cliente'; // ✅ Importar modelo Cliente
import bcrypt from 'bcryptjs';

connectDB();

// ✅ Función para crear cliente automáticamente
// app/api/auth/register/route.ts

// app/api/auth/register/route.ts

// ✅ Funciones de normalización
function normalizeTelefono(text: string): string {
  if (!text) return '00000000';
  return text.trim().replace(/\s+/g, '').replace(/[^0-9+]/g, '') || '00000000';
}

function normalizeRazonSocial(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function crearClienteAutomatico(userData: {
  name: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
}) {
  try {
    const clienteExistente = await Cliente.findOne({ email: userData.email });
    if (clienteExistente) {
      console.log(`✅ Cliente ya existe para ${userData.email}`);
      return;
    }

    // ✅ Preparar datos con valores por defecto
    const nombre = userData.name?.trim() || 'Usuario';
    const apellido = userData.lastName?.trim() || '';
    const razonSocial = `${nombre} ${apellido}`.trim() || userData.email;
    const telefono = userData.phone?.trim() || '00000000';

    // ✅ Normalizar campos explícitamente
    const razonSocialNormalized = normalizeRazonSocial(razonSocial);
    const telefonoNormalized = normalizeTelefono(telefono);

    // ✅ Crear cliente PASANDO EXPLÍCITAMENTE todos los campos
    const nuevoCliente = new Cliente({
      razonSocial: razonSocial,
      razonSocialNormalized: razonSocialNormalized,
      nombre: nombre,
      apellido: apellido,
      email: userData.email,
      telefono: telefono,
      telefonoNormalized: telefonoNormalized,
      direccion: userData.address || '',
      ciudad: userData.city || '',
      provincia: '',
      formaPago: 'efectivo',
      activo: true,
      origen: 'registro_manual'
    });

    await nuevoCliente.save();
    console.log(`✅ Cliente creado automáticamente para ${userData.email}`);
  } catch (error) {
    console.error('❌ Error creando cliente automático:', error);
  }
}

// Registro de Usuario
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 
    email, 
    password,
    name = '',
    lastName = '',
    phone = '',
    address = '',
    city = '',
    zipCode = ''
  } = body;

  try {
    // Validar que el correo no esté registrado
    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json({ message: 'El correo ya está registrado' }, { status: 400 });
    }

    // Crear el usuario con rol 'user' por defecto
    const newUser = new User({ 
      email, 
      password,
      name,
      lastName,
      phone,
      address,
      city,
      zipCode,
      role: 'user' // ✅ Rol user por defecto
    });
    await newUser.save();

    // ✅ Crear cliente automáticamente
    await crearClienteAutomatico({
      name,
      lastName,
      email,
      phone,
      address,
      city,
      zipCode
    });

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
        lastName: newUser.lastName,
        phone: newUser.phone,
        address: newUser.address,
        city: newUser.city,
        zipCode: newUser.zipCode
      }, 
      process.env.JWT_SECRET as string, 
      { expiresIn: '5h' }
    );

    return NextResponse.json({ 
      message: 'Usuario registrado', 
      token,
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
        lastName: newUser.lastName,
        phone: newUser.phone,
        address: newUser.address,
        city: newUser.city,
        zipCode: newUser.zipCode
      }
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error en el servidor' }, { status: 500 });
  }
}