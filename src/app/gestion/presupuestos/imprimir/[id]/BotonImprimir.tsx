"use client";

export default function BotonImprimir() {
  return (
    <button
      className="bg-amber-600 text-white px-4 py-1 rounded text-sm"
      onClick={() => window.print()}
    >
      Imprimir
    </button>
  );
}
