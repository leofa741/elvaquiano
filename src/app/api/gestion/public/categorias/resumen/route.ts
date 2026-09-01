import { NextResponse } from "next/server";
import connectDB from "@/app/lib/mongoose";
import Product from "@/app/models/Product";

export async function GET() {
  try {
    await connectDB();

    const resumen = await Product.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: "$categoria",
          totalProductos: { $sum: 1 },
          precioDesde: {
            $min: {
              $cond: [
                { $gt: ["$precioOferta", 0] },
                "$precioOferta",
                "$precioMayorista"
              ]
            }
          },
          imagenes: { $push: "$imagen" } // Agrupamos todas las imágenes
        }
      },
      {
        $project: {
          _id: 0,
          categoria: "$_id",
          total: "$totalProductos",
          desde: "$precioDesde",
          // Filtramos nulos/vacíos y tomamos máximo 3 imágenes
          imagenes: {
            $slice: [
              {
                $filter: {
                  input: "$imagenes",
                  as: "img",
                  cond: { $and: [{ $ne: ["$$img", null] }, { $ne: ["$$img", ""] }] }
                }
              },
              3 
            ]
          }
        }
      }
    ]);

    return NextResponse.json(resumen);
  } catch (error) {
    console.error("Error en GET /api/resumen:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}