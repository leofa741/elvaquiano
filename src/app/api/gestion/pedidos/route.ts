// src/app/api/gestion/pedidos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';

// Importamos los modelos
import Cliente from '@/app/models/Cliente';
import Product from '@/app/models/Product';
import Pedido from '@/app/models/Pedido';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';


// ✅ Aseguramos que los modelos se registren en Mongoose
// (evita MissingSchemaError al usar .populate)
const _ = (() => {
  void Cliente.modelName;
  void Product.modelName;
  void Pedido.modelName;
})();

// ---------------------------------------------
// POST: Crear pedido
// ---------------------------------------------
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      clienteId,
      productos,
      deposito,
      fechaEstimadaEntrega,
      notas
    } = body;

    if (!clienteId || !productos?.length || !deposito) {
      return NextResponse.json(
        { error: 'Cliente, productos y depósito son obligatorios.' },
        { status: 400 }
      );
    }

    const total = productos.reduce(
      (sum: number, p: any) => sum + (p.subtotal || 0),
      0
    );

    const nuevoPedido = new Pedido({
      cliente: clienteId,
      productos,
      deposito,
      fechaEstimadaEntrega: fechaEstimadaEntrega || null,
      notas: notas || null,
      total,
      estado: 'pendiente'
    });

    const guardado = await nuevoPedido.save();

    const pedidoConDatos = await Pedido.findById(guardado._id)
      .populate('cliente', 'razonSocial nombre apellido telefono')
      .populate({
        path: 'productos.producto',
        model: 'Product',
        select: 'nombre precio'
      });

    // Notificar a los clientes conectados sobre el nuevo pedido
    notifyPedidoClients({ type: 'pedido_creado', data: pedidoConDatos });

    return NextResponse.json(pedidoConDatos, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear pedido:', error);
    return NextResponse.json(
      { error: 'Error al crear el pedido', details: error.message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------
// GET: Listar pedidos
// ---------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const total = await Pedido.countDocuments();
    const pedidos = await Pedido.find()
      .populate('cliente', 'razonSocial')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      data: pedidos,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    return NextResponse.json({ error: 'Error al cargar pedidos' }, { status: 500 });
  }
}
