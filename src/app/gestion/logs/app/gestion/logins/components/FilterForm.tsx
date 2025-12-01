// app/gestion/logins/components/FilterForm.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FilterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";
  const provider = searchParams.get("provider") || "";

  const applyFilters = () => {
    const emailInput = (document.getElementById("email") as HTMLInputElement)?.value.trim() || "";
    const providerSelect = (document.getElementById("provider") as HTMLSelectElement)?.value || "";

    const params = new URLSearchParams();
    if (emailInput) params.set("email", emailInput);
    if (providerSelect) params.set("provider", providerSelect);
    params.set("page", "1");

    router.push(`/gestion/logins?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/gestion/logins");
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
          Email
        </label>
        <input
          id="email"
          type="text"
          placeholder="Buscar por email..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          defaultValue={email}
        />
      </div>

      <div>
        <label htmlFor="provider" className="block text-sm font-medium text-gray-300 mb-1">
          Método
        </label>
        <select
          id="provider"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          defaultValue={provider}
        >
          <option value="">Todos los métodos</option>
          <option value="google">Google</option>
          <option value="credentials">Email/Contraseña</option>
        </select>
      </div>

      <div className="flex items-end">
        <button
          onClick={applyFilters}
          className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition shadow"
        >
          Aplicar Filtros
        </button>
      </div>

      {(email || provider) && (
        <div className="flex items-end">
          <button
            onClick={clearFilters}
            className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}
