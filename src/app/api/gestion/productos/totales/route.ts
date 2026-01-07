import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';

export async function GET(request: NextRequest) {
  // 1️⃣ Validar sesión
  const session = await getServerSession(authOptions);
  if (!session?.user?.token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // 2️⃣ Validar rol desde el token
    const token = session.user.token;
    if (typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Acceso restringido' }, { status: 403 });
    }

    // 3️⃣ Conectar DB
    await connectDB();

    // 4️⃣ Leer parámetros de fecha
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const match: any = { activo: true };

    // ⚠️ Ajustá "createdAt" si usás otro campo de fecha
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    // 5️⃣ Traer productos filtrados
    const productos = await Product.find(
      match,
      'stock precioLista precioMayorista'
    ).lean();

    let totalLista = 0;
    let totalMayorista = 0;

    for (const p of productos) {
      const stockTotal = Array.isArray(p.stock)
        ? p.stock.reduce((sum, s) => sum + (s.cantidad || 0), 0)
        : p.stock || 0;

      totalLista += stockTotal * (p.precioLista || 0);
      totalMayorista += stockTotal * (p.precioMayorista || 0);
    }

    // 6️⃣ Respuesta
    return NextResponse.json({
      totalLista: Number(totalLista.toFixed(2)),
      totalMayorista: Number(totalMayorista.toFixed(2)),
    });
  } catch (error) {
    console.error('Error en /api/gestion/productos/totales:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
