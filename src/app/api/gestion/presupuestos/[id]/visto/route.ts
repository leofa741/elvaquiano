import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Presupuesto from '@/app/models/Presupuesto';

export async function PATCH(request: NextRequest, { params }: any) {
  await connectDB();

  const { id } = params;

  await Presupuesto.findByIdAndUpdate(id, {
    vistoPorAdmin: true,
  });

  return NextResponse.json({ ok: true });
}
