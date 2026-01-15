// app/search/SearchResults.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProductCard from '@/app/components/productcard/ProductCard';
import { useCart } from '@/app/context/CartContext';

interface Product {
  _id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidadUnidad: number;
  precioLista: number;
  precioMayorista: number;
  precioOferta?: number;
  imagen: string;
  stock: { deposito: string; cantidad: number }[];
  stockMinimoAlerta: number;
  activo: boolean;
}

export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState<Product[]>([]);
  const { addToCart } = useCart();

  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      return;
    }

    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) throw new Error('Error en la búsqueda');
        const data = await res.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (err) {
        console.error('Error fetching search results:', err);
        setProducts([]);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
        Resultados para: <span className="text-red-600">"{query}"</span>
      </h1>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No se encontraron productos.</p>
          <p className="text-gray-500 mt-2">Prueba con otro término de búsqueda.</p>
        </div>
      ) : (
        <div className="px-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onAdd={addToCart}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}