'use client';


import ProductCard from '@/app/components/productcard/ProductCard';
import { useCart } from '@/app/context/CartContext';

export default function CategoriaClient({ productos }: any) {
  const { addToCart } = useCart();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {productos.map((prod: any) => (
        <ProductCard
          key={prod._id}
          product={prod}
          onAdd={addToCart}
        />
      ))}
    </div>
  );
}
