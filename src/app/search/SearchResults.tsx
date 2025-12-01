'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

type Trabajo = {
  _id: string;
  titulo: string;
  imagenes: string[];
  categoria: string;
  descripcion: string;
};

export default function SearchResults() {
  const searchParams = useSearchParams();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrabajos  = async () => {
      const query = searchParams.get('q');

      if (!query) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (response.ok) {
          setTrabajos(data.products || []);
        } else {
          console.error('Error al buscar productos:', data.error);
        }
      } catch (error) {
        console.error('Error al buscar productos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrabajos();
  }, [searchParams]);

  if (loading) {
    return <p className="text-center">Cargando...</p>;
  }

  if (trabajos.length === 0) {
    return <p className="text-center">No se encontraron trabajos.</p>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Resultados de la búsqueda</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {
          trabajos.map((trabajo) => (
            <div
              key={trabajo._id}
              className="bg-white shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg p-4"
            >
              <h2 className="text-lg font-semibold">{trabajo.titulo}</h2>
              <Image
                src={trabajo.imagenes[0]}
                alt={trabajo.titulo}
                width={270}
                height={250}
                className="object-cover mb-4 mx-auto rounded-lg"
                priority={true}
                loading="eager"
              />
              <p className="text-gray-500">{trabajo.categoria}</p>
              <p className="text-gray-600">{trabajo.descripcion}</p>
            </div>
          ))
        }
      </div>
    </div>
  );
}