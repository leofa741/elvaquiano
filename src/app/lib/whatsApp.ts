import { formatARS } from './formatcurrenci';

export function sendWhatsApp(cart: any[]) {
  if (!cart.length) return;

  let total = 0;
  let productList = '';

  cart.forEach((p) => {
    const price =
      p.precioOferta && p.precioOferta < p.precioMayorista
        ? p.precioOferta
        : p.precioMayorista;

    total += price * p.qty;
    productList += `- *${p.nombre}*\n   ${p.qty} × ${formatARS(price)}\n`;
  });

  const message =
    `*NUEVO PEDIDO – EL VAQUIANO DIGITAL*\n\n` +
    `PRODUCTOS:\n${productList.trim()}\n\n` +
    `TOTAL: ${formatARS(total)}\n\n` +
    `Origen: www.elvaquianodigital.com.ar\n` +
    `¿Listo para confirmar el pedido?`;

  const phone = '5492224492051';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank');
}