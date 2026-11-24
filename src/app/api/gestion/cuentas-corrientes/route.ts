// API ruta: app/api/gestion/cuentas-corrientes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import Pedido from '@/app/models/Pedido';
import Pago from '@/app/models/Pago';
import CuentaCorriente from '@/app/models/CuentaCorriente';
import mongoose from 'mongoose';

const UMBRAL_GLOBAL = 50000;

function normalizarFormaPago(formaPago: any): string {
  if (!formaPago) return 'saldo pendiente';
  const valor = String(formaPago).toLowerCase().trim();
  const mapeo: Record<string, string> = {
    'efectivo': 'efectivo',
    'transferencia': 'transferencia',
    'transferencia bancaria': 'transferencia',
    'qr': 'qr',
    'tarjeta': 'tarjeta',
    'tarjeta de crédito': 'tarjeta',
    'tarjeta de débito': 'tarjeta',
    'cheque': 'cheque',
    'saldo pendiente': 'saldo pendiente',
    'cuenta_corriente': 'cuenta_corriente',
    'cuenta corriente': 'cuenta_corriente',
    'otro': 'otro'
  };
  return mapeo[valor] || 'otro';
}



export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { clienteId, tipo, importe, formaPago, descripcion, notas } = body;

    if (!clienteId || !importe || !tipo) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (clienteId, tipo, importe)' }, { status: 400 });
    }

    const formaPagoNormalizada = normalizarFormaPago(formaPago);
    const importeNumerico = parseFloat(importe);

    // 1. Obtener el saldo anterior del cliente
    const ultimoMovimiento = await CuentaCorriente.findOne({ cliente: clienteId })
      .sort({ fecha: -1, createdAt: -1 })
      .lean() as any;

    const saldoAnterior = ultimoMovimiento ? (ultimoMovimiento.saldoActual || 0) : 0;

    // 2. Calcular el nuevo saldo (Si es pago, RESTA. Si es ajuste/pedido, SUMA)
    const saldoActual = (tipo === 'pago')
      ? saldoAnterior - importeNumerico
      : saldoAnterior + importeNumerico;

    // 3. CREAR UN ÚNICO REGISTRO EN CUENTA CORRIENTE. 
    const nuevoMovimiento = await CuentaCorriente.create({
      cliente: clienteId,
      tipo: tipo,
      descripcion: descripcion || 'Registro de pago',
      importe: importeNumerico, // <-- AQUÍ VA EL MONTO TOTAL (Ej: 160.285)
      saldoAnterior: saldoAnterior,
      saldoActual: saldoActual,
      formaPago: formaPagoNormalizada,
      notas: notas || '',
      fecha: new Date() // Guarda la fecha/hora exacta (el frontend ya la formatea a es-AR)
    });

    // 4. (Opcional) Guardar también en la tabla de Pagos, pero UNA SOLA VEZ, sin fragmentar.
    if (tipo === 'pago') {
      await Pago.create({
        cliente: clienteId,
        monto: importeNumerico,
        formaPago: formaPagoNormalizada,
        fechaPago: new Date(),
        notas: descripcion || 'Pago registrado en Cuenta Corriente'
      });
    }

    // 5. Responder con éxito
    return NextResponse.json({
      success: true,
      data: nuevoMovimiento,
      saldoActual: saldoActual
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error en POST Cuentas Corrientes:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}


export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const pedidoId = searchParams.get('pedidoId');
    const clienteId = searchParams.get('clienteId');

    if (searchParams.get('pedidosRegistrados') === 'true') {
      const pedidos = await CuentaCorriente.distinct('pedido', {
        tipo: 'pedido',
        pedido: { $ne: null }
      }) as string[];
      return NextResponse.json({ pedidos }, { status: 200 });
    }

    if (pedidoId || clienteId) {
      const query: any = {};
      if (pedidoId) query.pedido = new mongoose.Types.ObjectId(pedidoId);
      else if (clienteId) query.cliente = new mongoose.Types.ObjectId(clienteId);

      const movimientos = await CuentaCorriente.find(query).sort({ fecha: 1, createdAt: 1 }).lean() as any[];
      const ultimo = movimientos.length > 0 ? movimientos[movimientos.length - 1] : null;
      const saldoPendiente = ultimo ? (ultimo.saldoActual || 0) : 0;

      return NextResponse.json({ saldoPendiente, movimientos, totalMovimientos: movimientos.length }, { status: 200 });
    }

    const saldosClientes = await CuentaCorriente.aggregate([
      { $match: { cliente: { $exists: true } } },
      { $sort: { cliente: 1, createdAt: -1, _id: -1 } },
          {
        $group: {
          _id: "$cliente",
          deudaTotal: { $first: "$saldoActual" },
          ultimosMovimientos: { $push: "$$ROOT" }
        }
      },
      // ✅ AHORA DEVUELVE A TODOS LOS CLIENTES QUE TENGAN AL MENOS UN MOVIMIENTO REGISTRADO, 
      // INCLUYENDO A LOS QUE YA PAGARON TODO (SALDO 0).
      {
        $project: {
          deudaTotal: 1,
          ultimosMovimientos: { $slice: ["$ultimosMovimientos", 35] } 
        }
      }
    ]);

    if (saldosClientes.length === 0) {
      return NextResponse.json({
        cuentasCorrientes: [], totalAdeudado: 0, cantidadClientes: 0, alertasActivas: 0
      }, { status: 200 });
    }

    const clientIds = saldosClientes.map((c: any) => c._id);

    const clientesData = await Cliente.find(
      { _id: { $in: clientIds }, activo: true },
      'razonSocial nombre apellido telefono email formaPago alerta'
    ).lean() as any[];

    const pedidosPorCliente = await Pedido.aggregate([
      {
        $match: {
          cliente: { $in: clientIds },
          activo: { $ne: false },
          estado: { $ne: 'cancelado' },
          estadoPago: { $in: ['pendiente', 'parcial'] }
        }
      },
      { $group: { _id: "$cliente", pedidosDeudores: { $sum: 1 } } }
    ]);

    const mapPedidos = new Map(pedidosPorCliente.map((p: any) => [p._id.toString(), p.pedidosDeudores]));
    const mapClientes = new Map(clientesData.map((c: any) => [c._id.toString(), c]));

    const cuentasConAlertas = saldosClientes.map((s: any) => {
      const clienteIdStr = s._id.toString();
      const cliente = mapClientes.get(clienteIdStr) || {};
      const pedidosDeudores = mapPedidos.get(clienteIdStr) || 0;
      const deudaTotal = s.deudaTotal || 0;
      const umbral = cliente.alerta?.umbralDeuda ?? UMBRAL_GLOBAL;

      const ultimosMovimientos = (s.ultimosMovimientos || []).map((mov: any) => ({
        descripcion: mov.descripcion || 'Sin descripción',
        tipo: mov.tipo || 'desconocido',
        fecha: mov.fecha ? new Date(mov.fecha).toISOString() : new Date().toISOString(), // ✅ ENVÍA FORMATO ISO SEGURO
        importe: mov.importe || 0,
        formaPago: mov.formaPago || 'N/A'
      }));

      return {
        clienteId: clienteIdStr,
        razonSocial: cliente.razonSocial || 'Desconocido',
        nombre: cliente.nombre || '',
        apellido: cliente.apellido || '',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        formaPago: cliente.formaPago || 'cuenta_corriente',
        notas: cliente.alerta?.notaAlerta || '',
        deudaTotal: parseFloat(deudaTotal.toFixed(2)),
        pedidosDeudores,
        tieneAlerta: deudaTotal > umbral,
        umbralUsado: umbral,
        alertaRevisada: cliente.alerta?.revisado ?? false,
        ultimosMovimientos
      };
    });

    cuentasConAlertas.sort((a, b) => b.deudaTotal - a.deudaTotal);

    const totalAdeudado = cuentasConAlertas.reduce((sum, c) => sum + c.deudaTotal, 0);
    const alertasActivas = cuentasConAlertas.filter(c => c.tieneAlerta && !c.alertaRevisada).length;

    return NextResponse.json({
      cuentasCorrientes: cuentasConAlertas,
      totalAdeudado,
      cantidadClientes: cuentasConAlertas.length,
      alertasActivas
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en GET Cuentas Corrientes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}