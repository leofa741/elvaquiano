import { NextRequest } from "next/server";
import { addProductClient, removeProductClient } from "./productsNotifier";

export function GET(req: NextRequest) {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        // Registrar cliente que escuchará los eventos
        addProductClient(controller);

        // Mantener viva la conexión con pings
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode("data: ping\n\n"));
        }, 25000);

        // Detectar si el cliente cerró sesión / pestaña
        req.signal.addEventListener("abort", () => {
          clearInterval(keepAlive);
          removeProductClient(controller);
          controller.close();
        });
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    }
  );
}
