// ⚠️ ¡ELIMINA 'use client' SI LO TENÍAS!
import { Suspense } from 'react';
import NuevoPedidoClient from './components/NuevoPedidoClient';


// ✅ searchParams es una Promise en Next.js 14+
export default function NuevoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-white">Cargando formulario...</div>}>
      <NuevoPedidoClient searchParams={searchParams} />
    </Suspense>
  );
}