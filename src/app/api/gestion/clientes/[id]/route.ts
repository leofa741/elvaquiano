import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import { NextRequest, NextResponse } from 'next/server';

connectDB();

// PUT — Actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    const {
      razonSocial,
      nombre,
      apellido,
      dni,
      telefono,
      email,
      direccion,
      ciudad,
      provincia,
      formaPago,
    } = body;

    if (!razonSocial?.trim() || !nombre?.trim() || !apellido?.trim() || !telefono?.trim()) {
      return NextResponse.json(
        { error: 'Razón social, nombre, apellido y teléfono son obligatorios.' },
        { status: 400 }
      );
    }

    // Validar DNI
    let dniLimpio: string | null = null;
    if (dni?.trim()) {
      dniLimpio = dni.replace(/\D/g, '');
      if (dniLimpio && !/^\d{7,8}$/.test(dniLimpio)) {
        return NextResponse.json({ error: 'DNI debe tener 7 u 8 dígitos.' }, { status: 400 });
      }
      const dniExistente = await Cliente.findOne({ dni: dniLimpio, _id: { $ne: id } });
      if (dniExistente) {
        return NextResponse.json({ error: 'Ya existe otro cliente con ese DNI.' }, { status: 409 });
      }
    }

    // Validar email
    let emailLimpio: string | null = null;
    if (email?.trim()) {
      emailLimpio = email.trim().toLowerCase();
      if (emailLimpio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
        return NextResponse.json({ error: 'El correo electrónico no es válido.' }, { status: 400 });
      }
      const emailExistente = await Cliente.findOne({ email: emailLimpio, _id: { $ne: id } });
      if (emailExistente) {
        return NextResponse.json({ error: 'Ya existe otro cliente con ese correo electrónico.' }, { status: 409 });
      }
    }

    const clienteActualizado = await Cliente.findByIdAndUpdate(
      id,
      {
        razonSocial: razonSocial.trim(),
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dniLimpio,
        telefono: telefono.trim(),
        email: emailLimpio,
        direccion: direccion?.trim() || null,
        ciudad: ciudad?.trim() || null,
        provincia: provincia?.trim() || null,
        formaPago: formaPago || 'efectivo',
      },
      { new: true, runValidators: true }
    );

    if (!clienteActualizado) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(clienteActualizado, { status: 200 });

  } catch (error: any) {
    console.error('Error al actualizar cliente:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Dato duplicado (DNI o email ya existente).' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: any) {
  try {
    const { id } = params;
    const cliente = await Cliente.findById(id);

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(cliente, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al cargar cliente' }, { status: 500 });
  }
}


// DELETE — Desactivar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const cliente = await Cliente.findByIdAndUpdate(
      id,
      { activo: false },
      { new: true }
    );

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cliente desactivado con éxito' }, { status: 200 });
  } catch (error) {
    console.error('Error al desactivar cliente:', error);
    return NextResponse.json({ error: 'Error al desactivar cliente' }, { status: 500 });
  }
}

// PATCH — Reactivar cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const cliente = await Cliente.findByIdAndUpdate(
      id,
      { activo: true },
      { new: true }
    );

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cliente reactivado con éxito' }, { status: 200 });
  } catch (error) {
    console.error('Error al reactivar cliente:', error);
    return NextResponse.json({ error: 'Error al reactivar cliente' }, { status: 500 });
  }
}
