import { formatARS } from './formatcurrenci';

interface WhatsAppPayload {
  cart: any[];
  telefono?: string;
  razonSocial?: string;
  presupuestoId?: string;
  totalPresupuesto?: number;
}

export function sendWhatsApp({
  cart,
  telefono,
  razonSocial,
  presupuestoId,
  totalPresupuesto,
}: WhatsAppPayload) {
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

  const totalFinal = totalPresupuesto ?? total;

  let message = `*NUEVO PEDIDO – EL VAQUIANO DIGITAL*\n\n`;

  if (razonSocial) {
    message += `👤 *Cliente:* ${razonSocial}\n`;
  }

  if (presupuestoId) {
    message += ` *Presupuesto:* ${presupuestoId}\n\n`;
  }
  

  message += ` *PRODUCTOS:*\n${productList.trim()}\n\n`;
  message += ` *TOTAL:* ${formatARS(totalFinal)}\n\n`;
  message += ` Origen: www.elvaquianodigital.com.ar\n`;
  message += `¿Confirmamos este pedido?`;

  const phone = telefono
    ? `549${telefono.replace(/\D/g, '')}`
    : '5492224492051'; // fallback admin

  const url = `https://wa.me/2224492051?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank');
}
