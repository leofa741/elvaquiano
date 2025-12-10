// app/api/gestion/presupuestos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Presupuesto from '@/app/models/Presupuesto';
import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';

const _ = (() => {
  void Cliente.modelName;
  void Presupuesto.modelName;

})();

connectDB();

// POST: Crear presupuesto
export async function POST(request: NextRequest) {




  try {
    const body = await request.json();
    const { clienteId, productos, validoHasta } = body;

    if (!clienteId || !productos?.length) {
      return NextResponse.json({ error: 'Cliente y productos son obligatorios' }, { status: 400 });
    }

    const total = productos.reduce((sum: number, p: any) => sum + p.subtotal, 0);

    const nuevo = new Presupuesto({
      cliente: clienteId,
      productos,
      total,
      validoHasta: validoHasta || null,
      estado: 'enviado'
    });

    const guardado = await nuevo.save();
    return NextResponse.json(guardado, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear presupuesto:', error);
    return NextResponse.json({ error: 'Error al crear el presupuesto' }, { status: 500 });
  }
}

// GET: Listar presupuestos
export async function GET() {


  try {
    const presupuestos = await Presupuesto.find()
      .populate('cliente', 'razonSocial pedidoAsociado')
      .sort({ createdAt: -1 });
    return NextResponse.json(presupuestos, { status: 200 });
  } catch (error) {
    console.error('Error al listar presupuestos:', error);
    return NextResponse.json({ error: 'Error al cargar presupuestos' }, { status: 500 });
  }
}

