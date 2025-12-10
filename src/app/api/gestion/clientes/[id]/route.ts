// app/api/gestion/clientes/[id]/route.ts
import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import { NextRequest, NextResponse } from 'next/server';
import { notifyClients } from '../events/clientsNotifier';


connectDB();

// GET: obtener cliente por id
export async function GET(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    const cliente = await Cliente.findById(params.id);
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado ' }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (error) {
    return NextResponse.json({ error: 'Error al buscar cliente' }, { status: 500 });
  }
}

// PUT: actualizar cliente
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const clienteActualizado = await Cliente.findByIdAndUpdate(params.id, body, { new: true });
  notifyClients({ type: 'cliente_actualizado', data: clienteActualizado });
  return NextResponse.json(clienteActualizado, { status: 200 });
}

// PATCH: reactivar cliente
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const cliente = await Cliente.findByIdAndUpdate(params.id, { activo: true }, { new: true });
  notifyClients({ type: 'cliente_reactivado', data: cliente });
  return NextResponse.json(cliente, { status: 200 });
}

// DELETE: desactivar cliente
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const cliente = await Cliente.findByIdAndUpdate(params.id, { activo: false }, { new: true });
  notifyClients({ type: 'cliente_eliminado', data: cliente });
  return NextResponse.json(cliente, { status: 200 });
}
