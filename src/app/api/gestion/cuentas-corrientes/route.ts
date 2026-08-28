
// API ruta  gestion/cuentas-corrientes/route.ts 

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


// ✅ FUNCIÓN CORREGIDA: Busca pagos en AMBAS tablas (Pago y CuentaCorriente)
async function actualizarEstadoPagoPedidos(
  clienteId: string, 
  montoPagado: number, 
  movimientoCCId: string,
  pedidoIdEspecifico?: string
) {
  try {
    console.log('🔍 [actualizarEstadoPagoPedidos] Iniciando...', {
      clienteId,
      montoPagado,
      movimientoCCId,
      pedidoIdEspecifico
    });

    // Si hay un pedidoId específico, actualizar solo ese
    if (pedidoIdEspecifico) {
      const pedido = await Pedido.findById(pedidoIdEspecifico);
      if (!pedido) {
        console.warn('⚠️ Pedido específico no encontrado:', pedidoIdEspecifico);
        return;
      }

      // ✅ BUSCAR EN AMBAS TABLAS
      const pagosEnPago = await Pago.find({ pedido: pedidoIdEspecifico });
      const pagosEnCC = await CuentaCorriente.find({
        cliente: clienteId,
        pedido: pedidoIdEspecifico,
        tipo: 'pago'
      });

      const totalPagadoEnPago = pagosEnPago.reduce((sum, p) => sum + Number(p.monto), 0);
      const totalPagadoEnCC = pagosEnCC.reduce((sum, p) => sum + Number(p.importe), 0);
      const totalPagado = totalPagadoEnPago + totalPagadoEnCC;

      const totalPedido = Number(pedido.total) || 0;

      console.log('📊 [Pedido específico]', { 
        totalPagadoEnPago, 
        totalPagadoEnCC, 
        totalPagado, 
        totalPedido 
      });

      if (totalPagado >= totalPedido) {
        pedido.estadoPago = 'pagado';
      } else if (totalPagado > 0) {
        pedido.estadoPago = 'parcial';
      } else {
        pedido.estadoPago = 'pendiente';
      }
      await pedido.save();
      console.log('✅ [Pedido específico] Actualizado a:', pedido.estadoPago);
      return;
    }

    // ✅ Si NO hay pedidoId específico, distribuir el pago entre pedidos pendientes
    const pedidosPendientes = await Pedido.find({
      cliente: new mongoose.Types.ObjectId(clienteId),
      estadoPago: { $in: ['pendiente', 'parcial'] },
      activo: { $ne: false },
      estado: { $ne: 'cancelado' }
    }).sort({ createdAt: 1 });

    console.log('📋 [Pedidos pendientes encontrados]', pedidosPendientes.length);

    if (pedidosPendientes.length === 0) {
      console.warn('⚠️ No hay pedidos pendientes para el cliente', clienteId);
      return;
    }

    let montoRestante = montoPagado;
    
    const movimientoOriginal = await CuentaCorriente.findById(movimientoCCId);
    if (!movimientoOriginal) {
      console.error('❌ Movimiento original no encontrado:', movimientoCCId);
      return;
    }

    await CuentaCorriente.findByIdAndDelete(movimientoCCId);

    let saldoAcumulado = movimientoOriginal.saldoAnterior || 0;
    let pedidosActualizados = 0;

    for (const pedido of pedidosPendientes) {
      if (montoRestante <= 0) break;

      const totalPedido = Number(pedido.total) || 0;
      
      // ✅ BUSCAR EN AMBAS TABLAS
      const pagosEnPago = await Pago.find({ pedido: pedido._id });
      const pagosEnCC = await CuentaCorriente.find({
        cliente: new mongoose.Types.ObjectId(clienteId),
        pedido: pedido._id,
        tipo: 'pago'
      });

      const totalPagadoEnPago = pagosEnPago.reduce((sum, p) => sum + Number(p.monto), 0);
      const totalPagadoEnCC = pagosEnCC.reduce((sum, p) => sum + Number(p.importe), 0);
      const totalPagadoPedido = totalPagadoEnPago + totalPagadoEnCC;
      
      const saldoPendientePedido = totalPedido - totalPagadoPedido;

      console.log('💰 [Procesando pedido]', {
        pedidoId: pedido._id,
        totalPedido,
        totalPagadoEnPago,
        totalPagadoEnCC,
        totalPagadoPedido,
        saldoPendientePedido,
        montoRestante
      });

      if (saldoPendientePedido <= 0) continue;

      const montoAplicado = Math.min(montoRestante, saldoPendientePedido);
      montoRestante -= montoAplicado;

      const saldoAnteriorPedido = saldoAcumulado;
      saldoAcumulado = saldoAcumulado - montoAplicado;

      const nuevoMovimiento = await CuentaCorriente.create({
        cliente: new mongoose.Types.ObjectId(clienteId),
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

      await Pago.create({
        pedido: pedido._id,
        cliente: new mongoose.Types.ObjectId(clienteId),
        monto: montoAplicado,
        formaPago: movimientoOriginal.formaPago || 'otro',
        fechaPago: new Date(),
        notas: `Pago desde Cuenta Corriente - ${movimientoOriginal.descripcion || 'Pago recibido'}`
      });

      const nuevoTotalPagado = totalPagadoPedido + montoAplicado;
      const estadoAnterior = pedido.estadoPago;
      
      if (nuevoTotalPagado >= totalPedido) {
        pedido.estadoPago = 'pagado';
      } else if (nuevoTotalPagado > 0) {
        pedido.estadoPago = 'parcial';
      }
      
      await pedido.save();
      pedidosActualizados++;
      
      console.log('✅ [Pedido actualizado]', {
        pedidoId: pedido._id,
        estadoAnterior,
        nuevoEstado: pedido.estadoPago,
        montoAplicado
      });
    }

    if (montoRestante > 0) {
      await CuentaCorriente.create({
        cliente: new mongoose.Types.ObjectId(clienteId),
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
      console.log('💵 [Saldo a favor generado]', montoRestante);
    }

    console.log('🎉 [actualizarEstadoPagoPedidos] Completado. Pedidos actualizados:', pedidosActualizados);

  } catch (error: any) {
    console.error('❌ [ERROR CRÍTICO] en actualizarEstadoPagoPedidos:', error);
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
  // ✅ Si es tipo 'pago', actualizar estado de pedidos (pasando el ID del movimiento)
if (tipo === 'pago') {
  await actualizarEstadoPagoPedidos(
    clienteId, 
    importeNumerico, 
    nuevoMovimientoCC._id.toString(),
    pedidoId || undefined
  );
  
  // ✅ NUEVO: Recalcular y retornar el estado actualizado de los pedidos
  const pedidosActualizados = await Pedido.find({
    cliente: new mongoose.Types.ObjectId(clienteId),
    activo: { $ne: false },
    estado: { $ne: 'cancelado' }
  }).select('_id estadoPago total').lean();
  
  return NextResponse.json({ 
    success: true, 
    data: nuevoMovimientoCC, 
    saldoActual,
    pedidosActualizados // ✅ El frontend puede verificar qué pedidos cambiaron
  }, { status: 201 });
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
      
      // ✅ EXTRAER DATOS DEL ÚLTIMO MOVIMIENTO DE FORMA SEGURA
      const ultimoMov = s.ultimoMovimiento || {};

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
        
        // ✅ NUEVO: Enviar la info del último movimiento al frontend
        ultimoMovimiento: {
          descripcion: ultimoMov.descripcion || 'Sin descripción',
          tipo: ultimoMov.tipo || 'desconocido',
          fecha: ultimoMov.fecha 
            ? new Date(ultimoMov.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
            : 'Sin fecha',
          importe: ultimoMov.importe || 0,
          formaPago: ultimoMov.formaPago || 'N/A'
        }
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