import { authOptions } from "@/app/lib/auth";
import connectDB from "@/app/lib/mongoose";
import Devolucion from "@/app/models/Devolucion";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

connectDB();

const isAuthorized = (role: string) => ['admin', 'superadmin', 'vendedor'].includes(role);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ Next.js 15: params es una Promise
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    // ✅ Next.js 15: debemos hacer await a params para obtener el id
    const { id } = await params;
    
    const devolucion = await Devolucion.findById(id).lean();
    
    if (!devolucion) {
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 });
    }

    return NextResponse.json(devolucion, { status: 200 });
  } catch (error) {
    console.error('Error al obtener devolución:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}