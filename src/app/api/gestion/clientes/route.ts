import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import { NextRequest, NextResponse } from 'next/server';
import { notifyClients } from './events/clientsNotifier';

connectDB();

// GET: Listar clientes (con soporte para búsqueda)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    let query: any = {};

    if (search && search.trim().length > 0) {
      // Si hay búsqueda, buscamos por texto (sin filtrar por 'activo' para encontrarlo aunque esté inactivo)
      const regex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { razonSocial: regex },
          { nombre: regex },
          { apellido: regex },
          { email: regex },
          { dni: regex }
        ]
      };
    } else {
      // Si NO hay búsqueda (carga inicial), solo traemos los que están activos o no tienen el campo definido
      query.activo = { $ne: false };
    }

    // ✅ CORRECCIÓN: Límite de 15 para búsqueda rápida, 500 para la lista completa
    const clientes = await Cliente.find(query)
      .select('_id razonSocial nombre apellido telefono email activo') 
      .sort({ razonSocial: 1 })
      .limit(search ? 15 : 500); 

    return NextResponse.json({ clientes }, { status: 200 });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    return NextResponse.json({ error: 'Error al cargar clientes' }, { status: 500 });
  }
}

// 🔧 Funciones de normalización
const normalizeRazonSocial = (text: string): string => {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const normalizeTelefono = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9+]/g, '');
};

// POST: Crear cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { razonSocial, nombre, apellido, telefono, dni, email, direccion, ciudad, provincia, formaPago } = body;

    if (!razonSocial?.trim() || !nombre?.trim() || !apellido?.trim() || !telefono?.trim()) {
      return NextResponse.json({ error: 'Razón social, nombre, apellido y teléfono son obligatorios.' }, { status: 400 });
    }

    const razonSocialOriginal = razonSocial.trim();
    const razonSocialNormalized = normalizeRazonSocial(razonSocialOriginal);
    const telefonoOriginal = telefono.trim();
    const telefonoNormalized = normalizeTelefono(telefonoOriginal);

    const razonSocialExistente = await Cliente.findOne({ razonSocialNormalized });
    if (razonSocialExistente) {
      return NextResponse.json({ 
        error: 'Ya existe un cliente con esta razón social.',
        clienteExistente: { _id: razonSocialExistente._id, razonSocial: razonSocialExistente.razonSocial }
      }, { status: 409 });
    }

    const telefonoExistente = await Cliente.findOne({ telefonoNormalized });
    if (telefonoExistente) {
      return NextResponse.json({ 
        error: 'Ya existe un cliente con este teléfono.',
        clienteExistente: { _id: telefonoExistente._id, razonSocial: telefonoExistente.razonSocial }
      }, { status: 409 });
    }

    let dniLimpio;
    if (dni?.trim()) {
      dniLimpio = dni.replace(/\D/g, '');
      if (!/^\d{7,8}$/.test(dniLimpio)) {
        return NextResponse.json({ error: 'DNI debe tener 7 u 8 dígitos.' }, { status: 400 });
      }
      const dniExistente = await Cliente.findOne({ dni: dniLimpio });
      if (dniExistente) {
        return NextResponse.json({ 
          error: 'Ya existe un cliente con ese DNI.',
          clienteExistente: { _id: dniExistente._id, razonSocial: dniExistente.razonSocial }
        }, { status: 409 });
      }
    }

    let emailLimpio;
    if (email?.trim()) {
      emailLimpio = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
        return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
      }
      const emailExistente = await Cliente.findOne({ email: emailLimpio });
      if (emailExistente) {
        return NextResponse.json({ 
          error: 'Ya existe un cliente con ese email.',
          clienteExistente: { _id: emailExistente._id, razonSocial: emailExistente.razonSocial }
        }, { status: 409 });
      }
    }

    const nuevoCliente = new Cliente({
      razonSocial: razonSocialOriginal,
      razonSocialNormalized,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefonoOriginal,
      telefonoNormalized,
      dni: dniLimpio,
      email: emailLimpio,
      direccion: direccion?.trim() || null,
      ciudad: ciudad?.trim() || null,
      provincia: provincia?.trim() || null,
      formaPago: formaPago || 'efectivo',
      activo: true,
      origen: 'presencial',
    });

    const clienteGuardado = await nuevoCliente.save();
    notifyClients({ type: 'nuevo_cliente', data: clienteGuardado });

    return NextResponse.json(clienteGuardado, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear cliente:', error);
    
    if (error.code === 11000 || error.name === 'MongoServerError') {
      return NextResponse.json({ error: 'Dato duplicado (razón social, teléfono, DNI o email ya existente).' }, { status: 409 });
    }
    
    if (error.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}