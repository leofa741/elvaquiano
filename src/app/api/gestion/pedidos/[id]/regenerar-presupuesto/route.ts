// app/api/gestion/pedidos/[id]/regenerar-presupuesto/route.ts
import connectDB from '@/app/lib/mongoose';
import Pedido from '@/app/models/Pedido';
import Presupuesto from '@/app/models/Presupuesto';
import { NextRequest } from 'next/server';

await connectDB();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // ✅ Ahora sí
 



  try {
    const pedido = await Pedido.findById(id);
    if (!pedido) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Crear un nuevo presupuesto basado en el pedido actual
    const nuevoPresupuesto = new Presupuesto({
      cliente: pedido.cliente,
      productos: pedido.productos.map((p: any) => ({
        producto: p.producto,
        nombre: p.nombre,
        unidad: p.unidad,
        cantidad: p.cantidad,
        unidadesFisicas: p.cantidad, // asumiendo 1:1
        tipoPrecio: p.tipoPrecio,
        precioAplicado: p.precioAplicado,
        subtotal: p.subtotal,
         deposito: p.deposito, 
      })),
      total: pedido.total,
      estado: 'borrador',
      origen: pedido.origen || 'regenerado', // ✅ Asegura que siempre haya un valor
      notas: `Presupuesto regenerado a partir del pedido #${pedido._id.toString().slice(-6).toUpperCase()}`,
      // Puedes agregar validoHasta si lo usás
    });

    const saved = await nuevoPresupuesto.save();

    return Response.json(
      { _id: saved._id.toString(), pedidoOrigen: pedido._id.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al regenerar presupuesto:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}