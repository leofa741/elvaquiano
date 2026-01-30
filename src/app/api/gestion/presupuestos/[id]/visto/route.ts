import connectDB from '@/app/lib/mongoose';
import Presupuesto from '@/app/models/Presupuesto';
import { NextResponse } from 'next/server';

export async function PATCH(
  _: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();

  await Presupuesto.findByIdAndUpdate(params.id, {
    vistoPorAdmin: true
  });

  return NextResponse.json({ ok: true });
}
