import { NextResponse } from "next/server";
import connectDB from "@/app/lib/mongoose";
import Product from "@/app/models/Product";

export async function GET() {
  try {
    await connectDB();

    const resumen = await Product.aggregate([
      {
        $group: {
          _id: "$categoria",
          totalProductos: { $sum: 1 },
          precioDesde: {
            $min: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ["$precioOferta", false] },
                    { $lt: ["$precioOferta", "$precioMayorista"] }
                  ]
                },
                "$precioOferta",
                "$precioMayorista"
              ]
            }
          }
        }
      }
    ]);

    return NextResponse.json(resumen);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener resumen" }, { status: 500 });
  }
}
