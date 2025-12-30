// app/api/gestion/cuentas-corrientes/alertas/[clienteId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest, { params }: any) {
  try {
    await connectDB();
    const body = await request.json();
    const { revisado, notaAlerta, umbralDeuda } = body;
    const { clienteId } = params;

        if (!ObjectId.isValid(clienteId)) {
      return NextResponse.json({ error: 'ID de cliente inválido' }, { status: 400 });
    }

    const updateFields: any = { 'alerta.ultimaRevision': new Date() };

    if (typeof revisado === 'boolean') updateFields['alerta.revisado'] = revisado;
    if (typeof notaAlerta === 'string') updateFields['alerta.notaAlerta'] = notaAlerta;
    if (typeof umbralDeuda === 'number' && umbralDeuda >= 0) {
      updateFields['alerta.umbralDeuda'] = umbralDeuda;
    }

    const cliente = await Cliente.findByIdAndUpdate(
      clienteId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('Error al actualizar alerta:', error);
    return NextResponse.json({ error: 'Error al actualizar alerta' }, { status: 500 });
  }
}