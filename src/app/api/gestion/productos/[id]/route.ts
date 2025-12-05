import { NextRequest, NextResponse as Response } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import connectDB from "@/app/lib/mongoose";
import Product from "@/app/models/Product";

connectDB();

const isAdmin = (role: string) => ["admin", "superadmin"].includes(role);

// 🔹 OBTENER UN PRODUCTO POR ID
export async function GET(req: NextRequest, { params }: any) {
    try {
        const product = await Product.findById(params.id);
        if (!product) {
            return Response.json({ error: "Producto no encontrado" }, { status: 404 });
        }
        return Response.json(product);
    } catch (error) {
        return Response.json({ error: "Error interno" }, { status: 500 });
    }
}

// 🔹 ACTUALIZAR PRODUCTO
export async function PUT(req: NextRequest, { params }: any) {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isAdmin(session.user.role)) {
        return Response.json({ error: "Acceso denegado" }, { status: 403 });
    }

    try {
        const data = await req.json();

        // 🧹 Filtrar lotes vacíos
        const lotesFiltrados = (data.lotes || []).filter((l: any) =>
            l.lote?.trim() ||
            l.deposito?.trim() ||
            l.vencimiento ||
            (l.cantidad && l.cantidad > 0)
        );

        const updated = await Product.findByIdAndUpdate(
            params.id,
            {
                nombre: data.nombre,
                categoria: data.categoria,
                unidad: data.unidad,
                cantidadUnidad: Number(data.cantidadUnidad),
                precioMayorista: data.precioMayorista,
                precioMinorista: data.precioMinorista,
                stock: data.stock || [],
                lotes: lotesFiltrados,
                imagen: data.imagen || null,
                activo: data.activo ?? true,
            },
            { new: true }
        );

        if (!updated) {
            return Response.json({ error: "Producto no encontrado" }, { status: 404 });
        }

        return Response.json(updated);
    } catch (error) {
        console.error(error);
        return Response.json({ error: "Error al actualizar producto" }, { status: 500 });
    }
}

// 🔹 ELIMINAR PRODUCTO
export async function DELETE(req: NextRequest, { params }: any) {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isAdmin(session.user.role)) {
        return Response.json({ error: "Acceso denegado" }, { status: 403 });
    }

    try {
        const deleted = await Product.findByIdAndDelete(params.id);

        if (!deleted) {
            return Response.json({ error: "Producto no encontrado" }, { status: 404 });
        }

        return Response.json({ message: "Producto eliminado" });
    } catch (error) {
        return Response.json({ error: "Error al eliminar producto" }, { status: 500 });
    }
}
