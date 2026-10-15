import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';
import { slugify } from '@/app/lib/slugify';
import CategoriaClient from './CategoriaClient';
import type { Metadata } from 'next';

export const revalidate = 300;

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// 👇 1. Metadata dinámica con reversión inteligente del slug
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  // Revertimos el slugify: "aceite-de-girasol" -> "Aceite De Girasol"
  const categoriaNombre = slug
    .replace(/-/g, ' ') // 1. Reemplaza guiones por espacios
    .replace(/\b\w/g, (char) => char.toUpperCase()); // 2. Capitaliza la primera letra de cada palabra

  return {
    title: `${categoriaNombre} | Distribuidora El Vaquiano`,
    description: `Encontrá los mejores productos de ${categoriaNombre.toLowerCase()} al mejor precio mayorista y minorista en El Vaquiano.`,
    openGraph: {
      title: `${categoriaNombre} | Distribuidora El Vaquiano`,
      description: `Catálogo completo de ${categoriaNombre.toLowerCase()} para tu negocio.`,
      type: 'website',
    }
  };
}

export default async function CategoriaPage({ params }: PageProps) {
  // 👇 Tu lógica original intacta (OBLIGATORIO en Next 15)
  const { slug } = await params;

  await connectDB();

  const productosDB = await Product.find({ activo: true }).lean();

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
    (p: any) => slugify(p.categoria) === slug
  );

  if (!filtrados.length) {
    return <div className="p-6">Categoría sin productos</div>;
  }

  const categoriaActual = filtrados[0].categoria;

  // 👇 2. JSON-LD específico para que Google entienda que esto es un Catálogo (CollectionPage)
  const categoryJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoriaActual} | Distribuidora El Vaquiano`,
    description: `Catálogo de productos de la categoría ${categoriaActual} en Distribuidora El Vaquiano.`,
    url: `https://elvaquiano.com.ar/categoria/${slug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Distribuidora El Vaquiano',
      url: 'https://elvaquiano.com.ar',
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: filtrados.slice(0, 12).map((prod: any, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: prod.nombre,
        }
      }))
    }
  };

  // 👇 3. Tu return original, envuelto en <> </> para inyectar el script de forma invisible
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryJsonLd) }}
      />
      
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">
          {categoriaActual}
        </h1>

        <CategoriaClient productos={filtrados} />
      </div>
    </>
  );
}