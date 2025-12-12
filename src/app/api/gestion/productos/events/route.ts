// app/api/gestion/productos/events/route.ts
import { NextRequest } from 'next/server';
import { addProductClient, removeProductClient } from './productsNotifier';

export function GET(req: NextRequest) {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        addProductClient(controller);
        

        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode("data: ping\n\n"));
        }, 25000);

        req.signal.addEventListener("abort", () => {
          clearInterval(keepAlive);
          removeProductClient(controller);
          controller.close();
        });
      }
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    }
  );
}
