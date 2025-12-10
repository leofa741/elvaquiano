// app/gestion/pedidos/nuevo/page.tsx
import { Suspense } from 'react';
import NuevoPedidoClient from './components/NuevoPedidoClient';


export default function NuevoPedidoPage({
  searchParams,
}: {
  searchParams: { clienteId?: string };
}) {
  return (
    <Suspense fallback={<div className="p-8 text-white">Cargando formulario...</div>}>
      <NuevoPedidoClient clienteIdFromUrl={searchParams.clienteId || ''} />
    </Suspense>
  );
}