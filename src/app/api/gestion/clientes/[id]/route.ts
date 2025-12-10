import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import { NextResponse } from 'next/server';
import { notifyClients } from './events/clientsNotifier';


connectDB();

// --------------------------------------------------
// PUT: Actualizar cliente
// --------------------------------------------------
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { id } = await params;

    // Validaciones como ya tienes...
    // ...

    const clienteActualizado = await Cliente.findByIdAndUpdate(
      id,
      {
        razonSocial: body.razonSocial.trim(),
        nombre: body.nombre.trim(),
        apellido: body.apellido.trim(),
        dni: body.dni?.trim() || null,
        telefono: body.telefono.trim(),
        email: body.email?.trim().toLowerCase() || null,
        direccion: body.direccion?.trim() || null,
        ciudad: body.ciudad?.trim() || null,
        provincia: body.provincia?.trim() || null,
        formaPago: body.formaPago || 'efectivo',
      },
      { new: true, runValidators: true }
    );

    if (!clienteActualizado) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // 🔥 Notificar a todas las sesiones que hay actualización
    notifyClients({ type: 'cliente_actualizado', data: clienteActualizado });

    return NextResponse.json(clienteActualizado, { status: 200 });
  } catch (error: any) {
    console.error('Error al actualizar cliente:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// --------------------------------------------------
// PATCH: Reactivar cliente
// --------------------------------------------------
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cliente = await Cliente.findByIdAndUpdate(id, { activo: true }, { new: true });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // 🔥 Notificar a todas las sesiones
    notifyClients({ type: 'cliente_reactivado', data: cliente });

    return NextResponse.json(cliente, { status: 200 });
  } catch (error) {
    console.error('Error al reactivar cliente:', error);
    return NextResponse.json({ error: 'Error al reactivar cliente' }, { status: 500 });
  }
}

// --------------------------------------------------
// DELETE: Eliminar cliente
// --------------------------------------------------
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const clienteEliminado = await Cliente.findByIdAndDelete(id);

    if (!clienteEliminado) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // 🔥 Notificar a todas las sesiones
    notifyClients({ type: 'cliente_eliminado', data: clienteEliminado });

    return NextResponse.json({ message: 'Cliente eliminado con éxito' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}
