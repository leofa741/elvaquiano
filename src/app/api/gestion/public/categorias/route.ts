// app/api/public/categorias/route.ts
import connectDB from '@/app/lib/mongoose';
import Product from '@/app/models/Product';
import { slugify } from '@/app/lib/slugify';
import { NextResponse } from 'next/server';


export const revalidate = 300; // ISR 5 min

export async function GET() {
  await connectDB();

  const categorias = await Product.distinct('categoria');

  const result = categorias.map((name) => ({
    name,
    slug: slugify(name),
  }));

  return NextResponse.json(result);
}
