// app/api/gestion/cuentas-corrientes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import Pedido from '@/app/models/Pedido';
import Pago from '@/app/models/Pago';

export async function GET() {
  try {
    await connectDB();

    // 1. Obtener todos los clientes con formaPago = 'cuenta_corriente' (o todos si querés)
    const clientes = await Cliente.find({ 
      activo: true,
      // formaPago: 'cuenta_corriente' // ← descomentá si solo querés CC
    }, 'razonSocial nombre apellido telefono email formaPago');

    const cuentasCorrientes = [];

    // 2. Para cada cliente, calcular deuda total
    for (const cliente of clientes) {
      const pedidos = await Pedido.find({ 
        cliente: cliente._id, 
        activo: true,
        estado: { $ne: 'cancelado' }
      }, '_id total');

      let deudaTotal = 0;
      const detallesPedidos = [];

      for (const pedido of pedidos) {
        const pagos = await Pago.find({ pedido: pedido._id });
       
        
        const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
        const saldo = pedido.total - totalPagado;
        
        if (saldo > 0) {
          deudaTotal += saldo;
          detallesPedidos.push({
            pedidoId: pedido._id,
            total: pedido.total,            
            saldo,
            pagos: pagos.length
          });
        }
      }

      if (deudaTotal > 0) {
        cuentasCorrientes.push({
          clienteId: cliente._id,
          razonSocial: cliente.razonSocial,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          telefono: cliente.telefono,
          email: cliente.email,
          formaPago: cliente.formaPago,
         // notas : pagos
          deudaTotal: parseFloat(deudaTotal.toFixed(2)),
          pedidosDeudores: detallesPedidos.length,
          primerVencimiento: detallesPedidos.length ? new Date() : null // opcional: podés agregar fecha de pedido más antiguo
        });
      }
    }

    // 3. Ordenar por deuda (mayor a menor)
    cuentasCorrientes.sort((a, b) => b.deudaTotal - a.deudaTotal);

    return NextResponse.json({ 
      cuentasCorrientes,
      totalAdeudado: cuentasCorrientes.reduce((sum, c) => sum + c.deudaTotal, 0),
      cantidadClientes: cuentasCorrientes.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error al cargar cuentas corrientes:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}