// app/api/gestion/productos/events/productsNotifier.ts
let productClients: ReadableStreamDefaultController[] = [];

export function addProductClient(controller: ReadableStreamDefaultController) {
  productClients.push(controller);
}

export function removeProductClient(controller: ReadableStreamDefaultController) {
  productClients = productClients.filter(c => c !== controller);
}

export function notifyProducts(event: { type: string; data: any }) {
  const encoder = new TextEncoder();

  productClients.forEach(controller => {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch (err) {
      console.error("Error notificando SSE productos:", err);
    }
  });
}
