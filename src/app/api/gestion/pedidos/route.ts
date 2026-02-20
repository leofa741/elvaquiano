// src/app/api/gestion/pedidos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import Product from '@/app/models/Product';
import Pedido from '@/app/models/Pedido';
import { notifyPedidoClients } from '@/app/api/gestion/pedidos/events/pedidoClientsNotifier';

// ✅ Aseguramos que los modelos se registren en Mongoose
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
      origen, // ✅ Campo requerido agregado
      fechaEstimadaEntrega,
      notas
    } = body;

    // ✅ Validaciones explícitas antes de crear el documento
    if (!clienteId) {
      return NextResponse.json(
        { error: 'El cliente es obligatorio' },
        { status: 400 }
      );
    }

    if (!productos?.length) {
      return NextResponse.json(
        { error: 'Debe agregar al menos un producto' },
        { status: 400 }
      );
    }

    if (!deposito) {
      return NextResponse.json(
        { error: 'El depósito es obligatorio' },
        { status: 400 }
      );
    }

    if (!origen || !['online', 'mostrador'].includes(origen)) {
      return NextResponse.json(
        { error: 'Origen inválido. Debe ser "online" o "mostrador"' },
        { status: 400 }
      );
    }

    // ✅ Validar cada producto individualmente
    for (const p of productos) {
      if (!p.producto) {
        return NextResponse.json(
          { error: 'Cada producto debe tener un ID válido' },
          { status: 400 }
        );
      }

      if (!['mayorista', 'oferta'].includes(p.tipoPrecio)) {
        return NextResponse.json(
          { 
            error: `Tipo de precio inválido para "${p.nombre}". Debe ser "mayorista" o "oferta"` 
          },
          { status: 400 }
        );
      }

      // ✅ Protección contra precioOferta undefined
      if (p.tipoPrecio === 'oferta' && (p.precioAplicado === undefined || p.precioAplicado === null)) {
        return NextResponse.json(
          { error: `El producto "${p.nombre}" no tiene precio de oferta disponible` },
          { status: 400 }
        );
      }
    }

    const total = productos.reduce(
      (sum: number, p: any) => sum + (p.subtotal || 0),
      0
    );

    const nuevoPedido = new Pedido({
      cliente: clienteId,
      productos,
      deposito,
      origen, // ✅ Incluir origen
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
        select: 'nombre unidad precioMayorista precioOferta'
      });

    // Notificar a los clientes conectados
    notifyPedidoClients({ type: 'pedido_creado', data: pedidoConDatos });

    return NextResponse.json(pedidoConDatos, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error al crear pedido:', error);

    // ✅ Mostrar detalles específicos de validación de Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { 
          error: 'Validación fallida',
          details: validationErrors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Error al crear el pedido', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------
// GET: Listar pedidos
// ---------------------------------------------
// /app/api/gestion/pedidos/route.ts


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      Pedido.find()
        .populate('cliente', 'razonSocial')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Pedido.countDocuments(),
    ]);

    return NextResponse.json({
      data,
      totalPages: Math.ceil(totalItems / limit),
      totalItems, // 👈 Este es el que usa el frontend
    });
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    return NextResponse.json(
      { error: 'Error al cargar pedidos' },
      { status: 500 }
    );
  }
}