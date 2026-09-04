import { authOptions } from "@/app/lib/auth";
import connectDB from "@/app/lib/mongoose";
import Devolucion from "@/app/models/Devolucion";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

connectDB();

const isAuthorized = (role: string) => ['admin', 'superadmin', 'vendedor'].includes(role);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const devolucion = await Devolucion.findById(params.id).lean();
    
    if (!devolucion) {
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 });
    }

    return NextResponse.json(devolucion, { status: 200 });
  } catch (error) {
    console.error('Error al obtener devolución:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}