'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="px-4 py-2">
      <form onSubmit={handleSearch} className="flex w-full lg:max-w-md">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300"
          />
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
          />
        </div>
        <button type="submit" className="ml-2 px-5 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none">
          <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
