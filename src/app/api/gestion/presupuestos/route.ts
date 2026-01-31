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

   
    const origen = productos[0]?.origen;
   
    if (!clienteId || !productos?.length) {
      return NextResponse.json({ error: 'Cliente y productos son obligatorios' }, { status: 400 });
    }

    const total = productos.reduce((sum: number, p: any) => sum + p.subtotal, 0);

    const nuevo = new Presupuesto({
      cliente: clienteId,
      productos,
      total,
      validoHasta: validoHasta || null,
      estado: 'enviado',
      origen: origen,
    });

    const guardado = await nuevo.save();
    return NextResponse.json(guardado, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear presupuesto:', error);
    return NextResponse.json({ error: 'Error al crear el presupuesto' }, { status: 500 });
  }
}

// GET: Listar presupuestos
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1'); // página actual
    const limit = parseInt(url.searchParams.get('limit') || '10'); // cantidad por página
    const skip = (page - 1) * limit;

    const total = await Presupuesto.countDocuments(); // total de registros
    const presupuestos = await Presupuesto.find()
      .populate('cliente', 'razonSocial telefono pedidoAsociado')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      data: presupuestos,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (error) {
    console.error('Error al listar presupuestos:', error);
    return NextResponse.json({ error: 'Error al cargar presupuestos' }, { status: 500 });
  }
}
