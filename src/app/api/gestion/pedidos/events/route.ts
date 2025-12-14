import { NextRequest } from 'next/server';
import { addPedidoClient, removePedidoClient, notifyPedidoClients } from './pedidoClientsNotifier';

export async function GET(req: NextRequest) {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        addPedidoClient(controller);

        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode('data: ping\n\n'));
        }, 25000);

        controller.enqueue(encoder.encode('data: connected\n\n'));

        controller.close = () => {
          clearInterval(keepAlive);
          removePedidoClient(controller);
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

// Export para notificar cambios desde el backend
export { notifyPedidoClients };
