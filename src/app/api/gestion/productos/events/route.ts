// app/api/gestion/productos/events/route.ts
import { NextRequest } from 'next/server';
import { addProductStream, removeProductStream } from './productsNotifier';


export function GET(req: NextRequest) {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        addProductStream(controller);

        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode('data: ping\n\n'));
          } catch {
            clearInterval(keepAlive);
            removeProductStream(controller);
          }
        }, 25000);

        req.signal.addEventListener('abort', () => {
          clearInterval(keepAlive);
          removeProductStream(controller);
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