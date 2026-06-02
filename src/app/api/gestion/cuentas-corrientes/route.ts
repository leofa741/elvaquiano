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

// ✅ FUNCIÓN CORREGIDA: Ahora recibe el movimientoCCId para vincularlo al pedido

// ✅ FUNCIÓN CORREGIDA: Crea movimientos separados por cada pedido
async function actualizarEstadoPagoPedidos(
  clienteId: string, 
  montoPagado: number, 
  movimientoCCId: string,
  pedidoIdEspecifico?: string
) {
  try {
    // Si hay un pedidoId específico, actualizar solo ese
    if (pedidoIdEspecifico) {
      const pedido = await Pedido.findById(pedidoIdEspecifico);
      if (pedido) {
        const pagosDelPedido = await CuentaCorriente.find({
          cliente: clienteId,
          pedido: pedidoIdEspecifico,
          tipo: 'pago'
        }).sort({ createdAt: 1 });

        const totalPagado = pagosDelPedido.reduce((sum, p) => sum + Number(p.importe), 0);

        const totalPedido = Number(pedido.total) || 0;
        if (totalPagado >= totalPedido) {
          pedido.estadoPago = 'pagado';
        } else if (totalPagado > 0) {
          pedido.estadoPago = 'parcial';
        } else {
          pedido.estadoPago = 'pendiente';
        }
        await pedido.save();
      }
      return;
    }

    // ✅ Si NO hay pedidoId específico, distribuir el pago entre pedidos pendientes
    const pedidosPendientes = await Pedido.find({
      cliente: clienteId,
      estadoPago: { $in: ['pendiente', 'parcial'] },
      activo: true,
      estado: { $ne: 'cancelado' }
    }).sort({ createdAt: 1 });

    let montoRestante = montoPagado;
    
    // ✅ Obtener el movimiento original para copiar sus datos
    const movimientoOriginal = await CuentaCorriente.findById(movimientoCCId);
    if (!movimientoOriginal) return;

    // ✅ Eliminar el movimiento original (lo reemplazaremos por movimientos específicos por pedido)
    await CuentaCorriente.findByIdAndDelete(movimientoCCId);

    let saldoAcumulado = movimientoOriginal.saldoAnterior;

    for (const pedido of pedidosPendientes) {
      if (montoRestante <= 0) break;

      const totalPedido = Number(pedido.total) || 0;
      
      // Calcular cuánto ya se pagó de este pedido
      const pagosDelPedido = await CuentaCorriente.find({
        cliente: clienteId,
        pedido: pedido._id,
        tipo: 'pago'
      });
      
      const totalPagadoPedido = pagosDelPedido.reduce((sum, p) => sum + Number(p.importe), 0);
      const saldoPendientePedido = totalPedido - totalPagadoPedido;

      if (saldoPendientePedido <= 0) continue;

      // Determinar cuánto se aplica a este pedido
      const montoAplicado = Math.min(montoRestante, saldoPendientePedido);
      montoRestante -= montoAplicado;

      // ✅ Crear un NUEVO movimiento específico para este pedido
      const saldoAnteriorPedido = saldoAcumulado;
      saldoAcumulado = saldoAcumulado - montoAplicado;

      const nuevoMovimiento = await CuentaCorriente.create({
        cliente: clienteId,
        pedido: pedido._id,
        tipo: 'pago',
        referenciaId: pedido._id,
        descripcion: movimientoOriginal.descripcion || 'Pago recibido',
        importe: montoAplicado,
        saldoAnterior: saldoAnteriorPedido,
        saldoActual: saldoAcumulado,
        formaPago: movimientoOriginal.formaPago,
        notas: movimientoOriginal.notas
      });

      // ✅ CREAR REGISTRO EN TABLA PAGO para que la API de saldo lo encuentre
      await Pago.create({
        pedido: pedido._id,
        cliente: clienteId,
        monto: montoAplicado,
        formaPago: movimientoOriginal.formaPago || 'otro',
        fechaPago: new Date(),
        notas: `Pago desde Cuenta Corriente - ${movimientoOriginal.descripcion || 'Pago recibido'}`
      });

      // Actualizar estado del pedido
      const nuevoTotalPagado = totalPagadoPedido + montoAplicado;
      if (nuevoTotalPagado >= totalPedido) {
        pedido.estadoPago = 'pagado';
      } else if (nuevoTotalPagado > 0) {
        pedido.estadoPago = 'parcial';
      }
      await pedido.save();
    }

    // ✅ Si sobró monto (no había suficientes pedidos), crear un movimiento genérico
    if (montoRestante > 0) {
      await CuentaCorriente.create({
        cliente: clienteId,
        pedido: null,
        tipo: 'pago',
        referenciaId: null,
        descripcion: `${movimientoOriginal.descripcion || 'Pago recibido'} (Saldo a favor)`,
        importe: montoRestante,
        saldoAnterior: saldoAcumulado,
        saldoActual: saldoAcumulado - montoRestante,
        formaPago: movimientoOriginal.formaPago,
        notas: movimientoOriginal.notas
      });
    }

  } catch (error) {
    console.error('Error al actualizar estadoPago de pedidos:', error);
  }
}


export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { clienteId, pedidoId, tipo, importe, formaPago, descripcion, notas } = body;

    if (!clienteId || !importe || !tipo) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (clienteId, tipo, importe)' }, { status: 400 });
    }
    
    if (tipo === 'pedido' && !pedidoId) {
       return NextResponse.json({ error: 'pedidoId es requerido para tipo pedido' }, { status: 400 });
    }

    const formaPagoNormalizada = normalizarFormaPago(formaPago);

    const ultimoMovimiento = await CuentaCorriente.findOne({ cliente: clienteId })
      .sort({ fecha: -1, createdAt: -1 })
      .lean() as any;

    const saldoAnterior = ultimoMovimiento ? (ultimoMovimiento.saldoActual || 0) : 0;
    const importeNumerico = parseFloat(importe);
    
    const saldoActual = (tipo === 'pedido' || tipo === 'ajuste') 
      ? saldoAnterior + importeNumerico 
      : saldoAnterior - importeNumerico;

    let referenciaId = pedidoId || null;
    
    if (tipo === 'pago') {
      const nuevoPago = await Pago.create({
        pedido: pedidoId || null,
        cliente: clienteId,
        monto: importeNumerico,
        formaPago: formaPagoNormalizada, 
        fechaPago: new Date(),
        notas: notas || descripcion
      });
      referenciaId = nuevoPago._id;
    }

    // ✅ Crear PRIMERO el movimiento de Cuenta Corriente
    const nuevoMovimientoCC = await CuentaCorriente.create({
      cliente: clienteId,
      pedido: pedidoId || null,
      tipo,
      referenciaId: referenciaId,
      descripcion: descripcion || (tipo === 'ajuste' ? 'Ajuste manual de deuda' : (tipo === 'pedido' ? 'Nuevo pedido' : 'Registro de pago')),
      importe: importeNumerico,
      saldoAnterior,
      saldoActual,
      formaPago: formaPagoNormalizada,
      notas
    });

    // ✅ Si es tipo 'pago', actualizar estado de pedidos (pasando el ID del movimiento)
    if (tipo === 'pago') {
      await actualizarEstadoPagoPedidos(
        clienteId, 
        importeNumerico, 
        nuevoMovimientoCC._id.toString(),
        pedidoId || undefined
      );
    }

    // Si es tipo 'pedido', también actualizar el pedido a "pendiente"
    if (tipo === 'pedido' && pedidoId) {
      const pedido = await Pedido.findById(pedidoId);
      if (pedido && pedido.estadoPago === 'pagado') {
        pedido.estadoPago = 'pendiente';
        await pedido.save();
      }
    }

    return NextResponse.json({ success: true, data: nuevoMovimientoCC, saldoActual }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST Cuentas Corrientes:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// ✅ GET: (mantén el GET igual que ya lo tienes)
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
          ultimoMovimiento: { $first: "$$ROOT" }
        }
      },
      { $match: { deudaTotal: { $gt: 0 } } }
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
      { $match: { cliente: { $in: clientIds }, activo: true, estado: { $ne: 'cancelado' } } },
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
        alertaRevisada: cliente.alerta?.revisado ?? false
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