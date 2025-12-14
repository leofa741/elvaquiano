const clients = new Set<ReadableStreamDefaultController>();

export function addPedidoClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
}

export function removePedidoClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
}

export function notifyPedidoClients(event: any) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  clients.forEach((controller) => {
    try {
      controller.enqueue(encoder.encode(data));
    } catch (err) {
      console.error('Error notifying pedido client:', err);
    }
  });
}
