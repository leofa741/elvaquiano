import connectDB from '@/app/lib/mongoose';
import Pedido from '@/app/models/Pedido';
import Presupuesto from '@/app/models/Presupuesto';
import { NextApiRequest, NextApiResponse } from 'next';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id } = req.query;

    // Conectar DB
    await connectDB();

    const presupuesto = await Presupuesto.findById(id);

    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    if (presupuesto.estado === 'convertido') {
      return res.status(400).json({ error: 'Ya está convertido' });
    }

    const nuevoPedido = new Pedido({
      cliente: presupuesto.cliente,
      productos: presupuesto.productos,
      deposito: presupuesto.productos[0]?.deposito || 'principal',
      total: presupuesto.total,
      estado: 'pendiente',
    });

    const pedidoGuardado = await nuevoPedido.save();

    presupuesto.pedidoAsociado = pedidoGuardado._id;
    presupuesto.estado = 'convertido';
    await presupuesto.save();

    return res.status(201).json({
      message: 'Presupuesto convertido',
      pedidoId: pedidoGuardado._id,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
