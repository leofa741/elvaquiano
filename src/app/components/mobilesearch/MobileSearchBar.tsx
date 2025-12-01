/* eslint-disable */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MobileSearchBarProps {
  isMenuOpen: boolean;
  closeMenu: () => void;
}

export default function MobileSearchBar({ isMenuOpen, closeMenu }: MobileSearchBarProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      // Cierra el menú antes de redirigir
      closeMenu();
      // Redirige a la página de resultados de búsqueda
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="px-4">
      <form onSubmit={handleSearch} className="flex bg-gray-100 rounded-full items-center w-full">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent px-4 py-2 outline-none"
        />
        <button type="submit" className="bg-amber-800 text-white px-4 py-2 rounded-full">
          Buscar
        </button>
      </form>
      {/* Botón para cerrar manualmente el menú */}
      <button onClick={closeMenu} className="mt-2 block text-gray-500 w-full text-center py-2 rounded-lg hover:bg-gray-200 transition">
        Cerrar
      </button>
    </div>
  );
}