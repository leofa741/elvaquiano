// app/api/gestion/presupuestos/[id]/convertir/route.ts

import { NextRequest, NextResponse } from 'next/server';

import connectDB from '@/app/lib/mongoose';
import Pedido from '@/app/models/Pedido';
import Presupuesto from '@/app/models/Presupuesto';

connectDB();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. Buscar el presupuesto
    const presupuesto = await Presupuesto.findById(id);
    if (!presupuesto) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
    }

    // 2. Verificar que no esté ya convertido
    if (presupuesto.estado === 'convertido') {
      return NextResponse.json({ error: 'Este presupuesto ya fue convertido' }, { status: 400 });
    }

    // 3. Crear el pedido
    const nuevoPedido = new Pedido({
      cliente: presupuesto.cliente,
      productos: presupuesto.productos.map((p: any) => ({
        producto: p.producto,
        nombre: p.nombre,
        unidad: p.unidad,
        deposito: p.deposito,
        cantidad: p.cantidad,
        tipoPrecio: p.tipoPrecio,
        precioAplicado: p.precioAplicado,
        subtotal: p.subtotal
      })),
      deposito: presupuesto.productos[0]?.deposito || 'principal', // fallback seguro
      total: presupuesto.total,
      estado: 'pendiente'
    });

    const pedidoGuardado = await nuevoPedido.save();

    // 4. Marcar el presupuesto como convertido
    presupuesto.pedidoAsociado = pedidoGuardado._id;
    presupuesto.estado = 'convertido';
    await presupuesto.save();

    // 5. Responder con el ID del nuevo pedido
    return NextResponse.json(
      { message: 'Presupuesto convertido en pedido', pedidoId: pedidoGuardado._id.toString() },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error al convertir presupuesto:', error);
    return NextResponse.json({ error: 'Error al convertir el presupuesto' }, { status: 500 });
  }
}