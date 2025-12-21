'use client';

export default function BotonImprimir() {
  return (
    <button
      className="w-full bg-amber-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-amber-700 transition"
      onClick={() => window.print()}
    >
      Imprimir Ticket
    </button>
  );
}