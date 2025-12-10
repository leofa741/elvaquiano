import { NextRequest } from "next/server";

let clients: any[] = [];

export function GET(req: NextRequest) {
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        clients.push(controller);

        // Mantener viva la conexión
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode("data: ping\n\n"));
        }, 25000);

        req.signal.onabort = () => {
          clearInterval(keepAlive);
          clients = clients.filter((c) => c !== controller);
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

// Función para emitir eventos
export function notifyClients(event: any) {
  const encoder = new TextEncoder();
  clients.forEach((controller) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
  );
}
