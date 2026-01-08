import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';
import { slugify } from '@/app/lib/slugify';
import CategoriaClient from './CategoriaClient';

export const revalidate = 300;

export default async function CategoriaPage({
  params,
}: {
  params: { slug: string };
}) {
  await connectDB();

const productosDB = await Product.find({ activo: true });

const productos = productosDB.map((p: any) => ({
  _id: p._id.toString(),
  nombre: p.nombre,
  categoria: p.categoria,
  unidad: p.unidad,
  cantidadUnidad: p.cantidadUnidad,
  precioLista: p.precioLista,
  precioMayorista: p.precioMayorista,
  precioOferta: p.precioOferta,
  stock: p.stock.map((s: any) => ({
    deposito: s.deposito,
    cantidad: s.cantidad,
  })),
  activo: p.activo,
  imagen: p.imagen,
  stockMinimoAlerta: p.stockMinimoAlerta,
}));


  const filtrados = productos.filter(
    (p: any) => slugify(p.categoria) === params.slug
  );

  if (!filtrados.length) {
    return <div className="p-6">Categoría sin productos</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {filtrados[0].categoria}
      </h1>

      {/* 👇 ACA SE INTEGRA TODO */}
      <CategoriaClient productos={filtrados} />
    </div>
  );
}
