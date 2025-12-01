'use client';

import { useRouter } from 'next/navigation';

export default function ClearFiltersButton() {
  const router = useRouter();

  const handleClear = () => {
    router.push('/gestion/logins');
  };

  return (
    <button
      type="button"
      onClick={handleClear}
      className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
    >
      Limpiar
    </button>
  );
}