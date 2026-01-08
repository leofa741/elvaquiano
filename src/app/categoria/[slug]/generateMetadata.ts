// app/categoria/[slug]/generateMetadata.ts
import Product from '@/app/models/Product';
import connectDB from '@/app/lib/mongoose';
import { slugify } from '@/app/lib/slugify';

export async function generateMetadata({ params }: any) {
  await connectDB();

  const prod = await Product.findOne();
  const categoria = prod?.categoria || params.slug;

  return {
    title: `${categoria} | El Vaquiano`,
    description: `Productos de ${categoria} al mejor precio`,
  };
}
