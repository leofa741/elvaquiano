import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import ReciboPago from '@/app/models/ReciboPago';
import Pago from '@/app/models/Pago';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        // 1. Obtener todos los recibos formales
        const recibosFormales = await ReciboPago.find()
            .populate('cliente')
            .sort({ fecha: -1 })
            .lean();

        // 2. Obtener todos los pagos registrados (incluye los simples)
        const pagos = await Pago.find()
            .populate('cliente')
            .sort({ fechaPago: -1 })
            .lean();

        const listaUnificada: any[] = [];

        // Agregamos primero todos los recibos formales (son la fuente de la verdad para reimprimir)
        for (const recibo of recibosFormales) {
            listaUnificada.push({
                _id: recibo._id,
                numero: recibo.numero,
                cliente: recibo.cliente,
                monto: Number(recibo.monto),
                formaPago: recibo.formaPago,
                concepto: recibo.concepto || 'Pago de deuda',
                deudaAnterior: Number(recibo.deudaAnterior) || 0,
                fecha: recibo.fecha,
                esReciboFormal: true,
                tipo: 'Recibo Formal'
            });
        }

        // Agregamos los pagos simples que NO coinciden con un recibo formal
        for (const pago of pagos) {
            const fechaPago = new Date(pago.fechaPago);
            const clienteId = typeof pago.cliente === 'object' && pago.cliente !== null 
                ? (pago.cliente as any)._id.toString() 
                : String(pago.cliente);
            const monto = Number(pago.monto);

            // Verificar si este pago ya está representado por un recibo formal
            // (Coincidencia por: mismo cliente, mismo monto, mismo día)
            const yaTieneRecibo = recibosFormales.some(r => {
                const rClienteId = typeof r.cliente === 'object' && r.cliente !== null 
                    ? (r.cliente as any)._id.toString() 
                    : String(r.cliente);
                const rFecha = new Date(r.fecha);
                
                return rClienteId === clienteId && 
                       Number(r.monto) === monto &&
                       rFecha.toDateString() === fechaPago.toDateString();
            });

            // Si NO tiene recibo formal, lo agregamos como "Pago Simple"
            if (!yaTieneRecibo) {
                listaUnificada.push({
                    _id: pago._id,
                    numero: null,
                    cliente: pago.cliente,
                    monto: monto,
                    formaPago: pago.formaPago,
                    concepto: pago.notas || 'Pago registrado en Cta. Cte.',
                    deudaAnterior: 0,
                    fecha: pago.fechaPago,
                    esReciboFormal: false,
                    tipo: 'Pago Simple'
                });
            }
        }

        // Ordenar toda la lista unificada por fecha descendente (lo más nuevo primero)
        listaUnificada.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        return NextResponse.json(listaUnificada, { status: 200 });
    } catch (error: any) {
        console.error('Error al obtener historial de pagos:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}