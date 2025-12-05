"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (err) {
        setProducts([]);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">Resultados para: "{query}"</h1>

      {products.length === 0 ? (
        <p>No se encontraron productos.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((p: any) => (
            <div key={p._id} className="border rounded-lg p-4 shadow-sm">
              <img src={p.imagen} alt={p.nombre} className="w-full h-48 object-cover rounded-t-lg" />
              <h2 className="text-lg font-bold">{p.nombre}</h2>
              <p className="text-sm">{p.categoria}</p>
              <p className="mt-2">Precio Minorista: ${p.precioMinorista.toFixed(2)}</p>
              <p>Precio Mayorista: ${p.precioMayorista.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
