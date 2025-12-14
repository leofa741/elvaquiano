// app/api/gestion/pedidos/events/pedidoClientsNotifier.ts

type PedidoController = ReadableStreamDefaultController<Uint8Array>;

const pedidoClients = new Set<PedidoController>();

export function addPedidoClient(controller: PedidoController) {
  pedidoClients.add(controller);
}

export function removePedidoClient(controller: PedidoController) {
  pedidoClients.delete(controller);
}

export function notifyPedidoClients(payload: any) {
  const encoder = new TextEncoder();
  const message = `data: ${JSON.stringify(payload)}\n\n`;

  for (const controller of pedidoClients) {
    try {
      controller.enqueue(encoder.encode(message));
    } catch {
      pedidoClients.delete(controller);
    }
  }
}
