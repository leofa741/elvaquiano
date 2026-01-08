import { formatARS } from './formatcurrenci';

export function sendWhatsApp(cart: any[], userName?: string, userEmail?: string) {
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

  // Si el usuario está logueado, incluimos sus datos
  if (userName && userEmail) {
    message += `CLIENTE:\nNombre: ${userName}\nEmail: ${userEmail}\n\n`;
  } else {
    // Si NO está logueado, mensaje amable de recordatorio
    message += `ℹ️ *¿Sabías que podrías agilizar tu próxima compra?*\nRegístrate en nuestro sitio con tu cuenta de Gmail o tus datos para guardar tu historial y disfrutar de una experiencia más rápida.\n\n`;
  }

  message += `Origen: www.elvaquianodigital.com.ar\n¿Listo para confirmar este pedido?`;

  const phone = '5492224492051';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank');
}