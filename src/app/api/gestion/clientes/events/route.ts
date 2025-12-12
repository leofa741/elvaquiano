// app/api/gestion/clientes/events/route.ts
import { NextRequest } from 'next/server';
import { addClient, removeClient } from './clientsNotifier';

export function GET(req: NextRequest) {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        addClient(controller);

        // Mantener viva la conexión
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode('data: ping\n\n'));
        }, 25000);

        // Detectar cierre de conexión
        req.signal.addEventListener('abort', () => {
          clearInterval(keepAlive);
          removeClient(controller);
          controller.close();
        });
        
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    }
  );
}
