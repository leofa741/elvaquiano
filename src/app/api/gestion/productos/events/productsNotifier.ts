// app/api/gestion/productos/productsNotifier.ts
let productStreams: ReadableStreamDefaultController[] = [];

export function addProductStream(controller: ReadableStreamDefaultController) {
  productStreams.push(controller);
}

export function removeProductStream(controller: ReadableStreamDefaultController) {
  productStreams = productStreams.filter(c => c !== controller);
}

export function notifyProducts(event: { type: string; data: any }) {
  const encoder = new TextEncoder();
  productStreams.forEach(controller => {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch (err) {
      console.error('Error notificando SSE de productos:', err);
      removeProductStream(controller);
    }
  });
}