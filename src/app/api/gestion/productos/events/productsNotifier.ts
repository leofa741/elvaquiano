let clients: ReadableStreamDefaultController[] = [];

export function addProductClient(controller: ReadableStreamDefaultController) {
  clients.push(controller);
}

export function removeProductClient(controller: ReadableStreamDefaultController) {
  clients = clients.filter((c) => c !== controller);
}

export function notifyProductClients(event: { type: string; data: any }) {
  const encoder = new TextEncoder();

  clients.forEach((controller) => {
    try {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
      );
    } catch (err) {
      console.error("Error notificando SSE a cliente:", err);
    }
  });
}
