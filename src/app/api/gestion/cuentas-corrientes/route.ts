// app/api/gestion/cuentas-corrientes/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import Pedido from '@/app/models/Pedido';
import Pago from '@/app/models/Pago';

const UMBRAL_GLOBAL = 50000; // Puedes hacerlo configurable más adelante

export async function GET() {
  try {
    await connectDB();

    const clientes = await Cliente.find({ activo: true }, 
      'razonSocial nombre apellido telefono email formaPago alerta'
    ).lean() as any[];

    const cuentasConAlertas = [];

    for (const cliente of clientes) {
      const pedidos = await Pedido.find({ 
        cliente: cliente._id, 
        activo: true,
        estado: { $ne: 'cancelado' }
      }, '_id total').lean();

      let deudaTotal = 0;
      let pedidosDeudores = 0;

      for (const pedido of pedidos) {
        const pagos = await Pago.find({ pedido: pedido._id }).lean();
        const totalPagado = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
        const saldo = (pedido.total || 0) - totalPagado;
        if (saldo > 0) {
          deudaTotal += saldo;
          pedidosDeudores++;
        }
      }

      if (deudaTotal > 0) {
        const umbral = cliente.alerta?.umbralDeuda ?? UMBRAL_GLOBAL;
        const tieneAlerta = deudaTotal > umbral;
        const revisado = cliente.alerta?.revisado ?? false;

        cuentasConAlertas.push({
          clienteId: cliente._id.toString(),
          razonSocial: cliente.razonSocial,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          telefono: cliente.telefono,
          email: cliente.email,
          formaPago: cliente.formaPago,
          notas: cliente.alerta?.notaAlerta || '',
          deudaTotal: parseFloat(deudaTotal.toFixed(2)),
          pedidosDeudores,
          tieneAlerta,
          umbralUsado: umbral,
          alertaRevisada: revisado
        });
      }
    }

    cuentasConAlertas.sort((a, b) => b.deudaTotal - a.deudaTotal);
    const totalAlertasActivas = cuentasConAlertas.filter(c => c.tieneAlerta && !c.alertaRevisada).length;

    return NextResponse.json({ 
      cuentasCorrientes: cuentasConAlertas,
      totalAdeudado: cuentasConAlertas.reduce((sum, c) => sum + c.deudaTotal, 0),
      cantidadClientes: cuentasConAlertas.length,
      alertasActivas: totalAlertasActivas
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en /api/gestion/cuentas-corrientes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}