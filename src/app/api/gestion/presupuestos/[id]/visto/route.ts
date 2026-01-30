import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import Presupuesto from '@/app/models/Presupuesto';

export async function PATCH(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  await connectDB();

  const { id } = context.params;

  await Presupuesto.findByIdAndUpdate(id, {
    vistoPorAdmin: true,
  });

  return NextResponse.json({ ok: true });
}
