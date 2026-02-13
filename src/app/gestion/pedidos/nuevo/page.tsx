// src/app/gestion/pedidos/nuevo/page.tsx
import { Suspense } from 'react';
import NuevoPedidoClient from './components/NuevoPedidoClient';

// ✅ Resuelve la Promise aquí en el Server Component
export default async function NuevoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  // Resolvemos la Promise
  const params = await searchParams;
  const clienteId = params?.clienteId || '';

  return (
    <Suspense fallback={<div className="p-8 text-white">Cargando formulario...</div>}>
      <NuevoPedidoClient clienteIdFromUrl={clienteId} />
    </Suspense>
  );
}