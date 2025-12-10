let clients: ReadableStreamDefaultController[] = [];

export function addClient(controller: ReadableStreamDefaultController) {
  clients.push(controller);
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients = clients.filter(c => c !== controller);
}

export function notifyClients(event: any) {
  const encoder = new TextEncoder();
  clients.forEach(controller => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  });
}
