// API ruta gestion/pagos/recibo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import ReciboPago from '@/app/models/ReciboPago';
import Cliente from '@/app/models/Cliente';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { clienteId, monto, formaPago, concepto, deudaAnterior } = body;

    if (!clienteId || !monto || !formaPago) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    // ✅ Generar número de recibo secuencial
    const ultimoRecibo = await ReciboPago.findOne().sort({ numero: -1 }).lean() as any;
    const numero = ultimoRecibo ? ultimoRecibo.numero + 1 : 1;

    const cliente = await Cliente.findById(clienteId).lean() as any;
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const recibo = await ReciboPago.create({
      numero,
      cliente: clienteId,
      monto: parseFloat(monto),
      formaPago,
      concepto: concepto || 'Pago de deuda',
      deudaAnterior: deudaAnterior || 0,
      fecha: new Date()
    });

    return NextResponse.json(recibo, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear recibo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const recibo = await ReciboPago.findById(id).populate('cliente').lean() as any;
    if (!recibo) {
      return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });
    }

    return NextResponse.json(recibo, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}