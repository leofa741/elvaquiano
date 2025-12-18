import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';


export async function GET(request: NextRequest) {
  // 1. Validar sesión
  const session = await getServerSession(authOptions);
  if (!session?.user?.token) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // 2. Decodificar token para verificar rol (opcional si ya lo haces en authOptions)
    const token = session.user.token;
    if (typeof token !== 'string') {
      return Response.json({ error: 'Token inválido' }, { status: 401 });
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!['admin', 'superadmin'].includes(payload.role)) {
      return Response.json({ error: 'Acceso restringido' }, { status: 403 });
    }

    // 3. Conectar a la base de datos
    await connectDB();

    // 4. Obtener todos los productos (solo los campos necesarios para eficiencia)
    const productos = await Product.find(
      { activo: true }, // Opcional: solo productos activos
      'stock precioLista precioMayorista'
    ).lean();

    let totalLista = 0;
    let totalMayorista = 0;

    for (const p of productos) {
      // Calcular stock total (soporta formato array o número)
      const stockTotal = Array.isArray(p.stock)
        ? p.stock.reduce((sum, s) => sum + (s.cantidad || 0), 0)
        : p.stock || 0;

      totalLista += stockTotal * (p.precioLista || 0);
      totalMayorista += stockTotal * (p.precioMayorista || 0);
    }

    // 5. Devolver respuesta
    return Response.json({
      totalLista: Number(totalLista.toFixed(2)),
      totalMayorista: Number(totalMayorista.toFixed(2)),
    });
  } catch (error) {
    console.error('Error en /api/gestion/productos/totales:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}