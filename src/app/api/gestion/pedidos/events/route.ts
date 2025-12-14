// route.ts
import { NextRequest } from 'next/server';
import { addPedidoClient, removePedidoClient } from './pedidoClientsNotifier';

export async function GET(req: NextRequest) {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        addPedidoClient(controller);

        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode('data: ping\n\n'));
          } catch {
            clearInterval(keepAlive);
            removePedidoClient(controller);
          }
        }, 25000);

        controller.enqueue(encoder.encode('data: connected\n\n'));

        // Sobrescribir close para limpiar
        const originalClose = controller.close;
        controller.close = () => {
          clearInterval(keepAlive);
          removePedidoClient(controller);
          originalClose?.();
        };
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    }
  );
}