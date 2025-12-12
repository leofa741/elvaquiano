// app/api/gestion/clientes/clientsNotifier.ts

let clients: ReadableStreamDefaultController[] = [];

export function addClient(controller: ReadableStreamDefaultController) {
  clients.push(controller);
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients = clients.filter(c => c !== controller);
}

export function notifyClients(event: { type: string; data: any }) {
  const encoder = new TextEncoder();
  clients.forEach(controller => {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch (err) {
      console.error('Error notificando cliente SSE:', err);
    }
  });
}
