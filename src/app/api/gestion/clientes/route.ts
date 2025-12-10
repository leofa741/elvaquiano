import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import { NextRequest, NextResponse } from 'next/server';
import { notifyClients } from './events/clientsNotifier';

connectDB();

// POST: crear cliente
export async function POST(request: NextRequest) {
  const body = await request.json();
  const nuevoCliente = new Cliente(body);
  const clienteGuardado = await nuevoCliente.save();

  // Notificar a todos los clientes conectados
  notifyClients({ type: 'nuevo_cliente', data: clienteGuardado });

  return NextResponse.json(clienteGuardado, { status: 201 });
}

// PUT: actualizar cliente
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const clienteActualizado = await Cliente.findByIdAndUpdate(params.id, body, { new: true });
  notifyClients({ type: 'cliente_actualizado', data: clienteActualizado });
  return NextResponse.json(clienteActualizado, { status: 200 });
}

// PATCH: reactivar cliente
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const cliente = await Cliente.findByIdAndUpdate(params.id, { activo: true }, { new: true });
  notifyClients({ type: 'cliente_reactivado', data: cliente });
  return NextResponse.json(cliente, { status: 200 });
}

// DELETE: desactivar cliente
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const cliente = await Cliente.findByIdAndUpdate(params.id, { activo: false }, { new: true });
  notifyClients({ type: 'cliente_eliminado', data: cliente });
  return NextResponse.json(cliente, { status: 200 });
}

// GET: Listar clientes
export async function GET() {
  try {
    const clientes = await Cliente.find({}).sort({ createdAt: -1 });
    return NextResponse.json(clientes, { status: 200 });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    return NextResponse.json({ error: 'Error al cargar clientes' }, { status: 500 });
  }
}