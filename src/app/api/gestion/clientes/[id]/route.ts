import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import { NextResponse } from 'next/server';

connectDB();

// --------------------------------------------------
// GET
// --------------------------------------------------
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
)  {

  try {
    const cliente = await Cliente.findById((await params).id);

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(cliente, { status: 200 });
  } catch (error) {
    console.error('Error al cargar cliente:', error);
    return NextResponse.json({ error: 'Error al cargar cliente' }, { status: 500 });
  }
}

// --------------------------------------------------
// PUT
// --------------------------------------------------
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

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

    let dniLimpio = null;
    if (dni?.trim()) {
      dniLimpio = dni.replace(/\D/g, '');
      if (!/^\d{7,8}$/.test(dniLimpio)) {
        return NextResponse.json({ error: 'DNI debe tener 7 u 8 dígitos.' }, { status: 400 });
      }
      const dniExistente = await Cliente.findOne({ dni: dniLimpio, _id: { $ne: id } });
      if (dniExistente) {
        return NextResponse.json({ error: 'Ya existe otro cliente con ese DNI.' }, { status: 409 });
      }
    }

    let emailLimpio = null;
    if (email?.trim()) {
      emailLimpio = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
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

  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    if ((error as any).code === 11000) {
      return NextResponse.json({ error: 'Dato duplicado (DNI o email ya existente).' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// --------------------------------------------------
// DELETE
// --------------------------------------------------
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
){
  try {
    const { id } = await params;
    const clienteEliminado = await Cliente.findByIdAndDelete(id);

    if (!clienteEliminado) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cliente eliminado con éxito' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}

// --------------------------------------------------
// PATCH
// --------------------------------------------------
export async function PATCH (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
