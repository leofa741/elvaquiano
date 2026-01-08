// app/api/gestion/productos/events/productsNotifier.ts

// --- NORMALIZADOR DE PRODUCTOS ---
export function normalizeProduct(product: any) {
  const plain = JSON.parse(JSON.stringify(product));

  if (typeof plain.stock === "number") {
    plain.stock = [{ cantidad: plain.stock }];
  }

  if (!plain.stock || !Array.isArray(plain.stock)) {
    plain.stock = [{ cantidad: 0 }];
  }

  return plain;
}

// --- CLIENTES SSE ---
let productClients: ReadableStreamDefaultController[] = [];

export function addProductClient(controller: ReadableStreamDefaultController) {
  productClients.push(controller);
}

export function removeProductClient(controller: ReadableStreamDefaultController) {
  productClients = productClients.filter(c => c !== controller);
}

// --- NOTIFICADOR SSE ---
export function notifyProducts(event: { type: string; data: any }) {
  const encoder = new TextEncoder();

  // 🔥 Normalizar producto ANTES de enviar el evento
  if (  event.type.includes("producto") ||  event.type === "stock_modificado" ||  event.type === "stock_reservado")  {
    event = {
      ...event,
      data: normalizeProduct(event.data)
    };
  }

  productClients.forEach(controller => {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch (err) {
      console.error("Error notificando SSE productos:", err);
    }
  });
}