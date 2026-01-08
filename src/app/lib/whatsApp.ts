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

  let message = `*NUEVO PEDIDO – EL VAQUIANO DIGITAL*\n\n`;
  message += `PRODUCTOS:\n${productList.trim()}\n\n`;
  message += `TOTAL: ${formatARS(total)}\n\n`;

 
  message += `Origen: www.elvaquianodigital.com.ar\n¿Listo para confirmar este pedido?`;

  const phone = '5492224492051';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank');
}