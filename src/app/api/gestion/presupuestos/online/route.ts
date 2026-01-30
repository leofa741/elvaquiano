import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import Presupuesto from '@/app/models/Presupuesto';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        await connectDB();

        const DEPOSITO_DEFAULT = 'san vicente';


        const body = await req.json();
        const { cliente: clienteInput, cart } = body;

        if (!clienteInput?.razonSocial || !clienteInput?.telefono || !cart?.length) {
            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 }
            );
        }

        // 🔍 Buscar cliente
        let cliente = await Cliente.findOne({
            razonSocial: clienteInput.razonSocial.trim(),
        });

        // ➕ Crear cliente si no existe
        if (!cliente) {
            cliente = await Cliente.create({
                razonSocial: clienteInput.razonSocial.trim(),
                nombre: 'Cliente',
                apellido: 'Online',
                telefono: clienteInput.telefono.trim(),
                activo: true,
                origen: 'online',
            });
        }

        // 📦 Productos
        const productos = cart.map((p: any) => {
            const precioAplicado =
                p.precioOferta && p.precioOferta < p.precioMayorista
                    ? p.precioOferta
                    : p.precioMayorista;

            return {
                producto: p._id,
                nombre: p.nombre,
                unidad: p.unidad,
                cantidad: p.qty,
                unidadesFisicas: p.qty,
                tipoPrecio:
                    precioAplicado === p.precioMayorista ? 'mayorista' : 'oferta',
                precioAplicado,
                subtotal: precioAplicado * p.qty,

                // ✅ CAMPO QUE FALTABA
                deposito: DEPOSITO_DEFAULT,
            };
        });


        const total = productos.reduce((acc: number, p: any) => acc + p.subtotal, 0);

        // 🧾 Crear presupuesto
        const presupuesto = await Presupuesto.create({
            cliente: cliente._id,
            productos,
            total,
            estado: 'borrador',
            origen: 'online',

        });

        return NextResponse.json({
            _id: presupuesto._id,
            total,
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
