// CategoriaClient.tsx
'use client';

import ProductCard from '@/app/components/productcard/ProductCard';
import { useCart } from '@/app/context/CartContext'; // Importamos el hook useCart para acceder a la función addToCart

export default function CategoriaClient({ productos }: any) {
  const { addToCart } = useCart();  // Obtenemos la función addToCart del contexto -> import { useCart } from '@/app/context/CartContext';

  return (
    <div className="px-4 py-2">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {productos.map((prod: any) => (
          <ProductCard
            key={prod._id}
            product={prod}
            onAdd={addToCart}  //  Pasamos la función addToCart al ProductCard
          />
        ))}
      </div>
    </div>
  );
}
