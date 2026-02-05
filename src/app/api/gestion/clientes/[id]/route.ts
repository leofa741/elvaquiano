// app/api/gestion/clientes/[id]/route.ts
import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import { NextRequest, NextResponse } from 'next/server';
import { notifyClients } from '../events/clientsNotifier';

connectDB();

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

// GET: obtener cliente por id
export async function GET(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const cliente = await Cliente.findById(params.id);
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (error) {
    return NextResponse.json({ error: 'Error al buscar cliente' }, { status: 500 });
  }
}

// PUT: actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const body = await request.json();
    
    // Buscar cliente existente
    const clienteExistente = await Cliente.findById(params.id);
    if (!clienteExistente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // 🔧 Normalizar razón social si cambió
    if (body.razonSocial && body.razonSocial.trim() !== clienteExistente.razonSocial) {
      const razonSocialOriginal = body.razonSocial.trim();
      const razonSocialNormalized = normalizeRazonSocial(razonSocialOriginal);
      
      // Verificar que no exista otro cliente con esta razón social
      const duplicado = await Cliente.findOne({
        razonSocialNormalized,
        _id: { $ne: params.id }
      });
      
      if (duplicado) {
        return NextResponse.json({ 
          error: 'Ya existe otro cliente con esta razón social.',
          clienteExistente: {
            _id: duplicado._id,
            razonSocial: duplicado.razonSocial
          }
        }, { status: 409 });
      }
      
      body.razonSocial = razonSocialOriginal;
      body.razonSocialNormalized = razonSocialNormalized;
    }

    // 🔧 Normalizar teléfono si cambió
    if (body.telefono && body.telefono.trim() !== clienteExistente.telefono) {
      const telefonoOriginal = body.telefono.trim();
      const telefonoNormalized = normalizeTelefono(telefonoOriginal);
      
      // Verificar que no exista otro cliente con este teléfono
      const duplicado = await Cliente.findOne({
        telefonoNormalized,
        _id: { $ne: params.id }
      });
      
      if (duplicado) {
        return NextResponse.json({ 
          error: 'Ya existe otro cliente con este teléfono.',
          clienteExistente: {
            _id: duplicado._id,
            razonSocial: duplicado.razonSocial
          }
        }, { status: 409 });
      }
      
      body.telefono = telefonoOriginal;
      body.telefonoNormalized = telefonoNormalized;
    }

    // 🔧 Normalizar DNI si cambió
    if (body.dni && body.dni.trim() !== clienteExistente.dni) {
      const dniLimpio = body.dni.replace(/\D/g, '');
      
      if (dniLimpio && !/^\d{7,8}$/.test(dniLimpio)) {
        return NextResponse.json({ error: 'DNI debe tener 7 u 8 dígitos.' }, { status: 400 });
      }
      
      // Verificar que no exista otro cliente con este DNI
      const duplicado = await Cliente.findOne({
        dni: dniLimpio,
        _id: { $ne: params.id }
      });
      
      if (duplicado) {
        return NextResponse.json({ 
          error: 'Ya existe otro cliente con este DNI.',
          clienteExistente: {
            _id: duplicado._id,
            razonSocial: duplicado.razonSocial
          }
        }, { status: 409 });
      }
      
      body.dni = dniLimpio || null;
    }

    // 🔧 Normalizar email si cambió
    if (body.email && body.email.trim() !== clienteExistente.email) {
      const emailLimpio = body.email.trim().toLowerCase();
      
      if (emailLimpio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
        return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
      }
      
      // Verificar que no exista otro cliente con este email
      const duplicado = await Cliente.findOne({
        email: emailLimpio,
        _id: { $ne: params.id }
      });
      
      if (duplicado) {
        return NextResponse.json({ 
          error: 'Ya existe otro cliente con este email.',
          clienteExistente: {
            _id: duplicado._id,
            razonSocial: duplicado.razonSocial
          }
        }, { status: 409 });
      }
      
      body.email = emailLimpio || null;
    }

    // Actualizar campos de texto
    if (body.nombre) body.nombre = body.nombre.trim();
    if (body.apellido) body.apellido = body.apellido.trim();
    if (body.direccion) body.direccion = body.direccion.trim();
    if (body.ciudad) body.ciudad = body.ciudad.trim();
    if (body.provincia) body.provincia = body.provincia.trim();

    // Actualizar cliente
    const clienteActualizado = await Cliente.findByIdAndUpdate(
      params.id, 
      body, 
      { new: true }
    );

    notifyClients({ type: 'cliente_actualizado', data: clienteActualizado });

    return NextResponse.json(clienteActualizado, { status: 200 });
  } catch (error: any) {
    console.error('Error al actualizar cliente:', error);
    
    if (error.code === 11000 || error.name === 'MongoServerError') {
      return NextResponse.json({ error: 'Dato duplicado (razón social, teléfono, DNI o email ya existente).' }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH: reactivar cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      params.id, 
      { activo: true }, 
      { new: true }
    );
    
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    
    notifyClients({ type: 'cliente_reactivado', data: cliente });
    return NextResponse.json(cliente, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al reactivar cliente' }, { status: 500 });
  }
}

// DELETE: desactivar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      params.id, 
      { activo: false }, 
      { new: true }
    );
    
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    
    notifyClients({ type: 'cliente_eliminado', data: cliente });
    return NextResponse.json(cliente, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al desactivar cliente' }, { status: 500 });
  }
}