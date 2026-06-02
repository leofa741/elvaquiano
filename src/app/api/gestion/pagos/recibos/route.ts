import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import ReciboPago from '@/app/models/ReciboPago';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const recibos = await ReciboPago.find()
            .populate('cliente')
            .sort({ fecha: -1 })
            .lean();

        return NextResponse.json(recibos, { status: 200 });
    } catch (error: any) {
        console.error('Error al obtener recibos:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}