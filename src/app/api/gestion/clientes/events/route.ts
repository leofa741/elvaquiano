import { NextRequest } from "next/server";
import { addClient, removeClient } from "./clientsNotifier";

export function GET(req: NextRequest) {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        addClient(controller);

        // Mantener viva la conexión
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode("data: ping\n\n"));
        }, 25000);

        req.signal.onabort = () => {
          clearInterval(keepAlive);
          removeClient(controller);
        };
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
}
