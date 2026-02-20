'use client';

import { useCart } from '@/app/context/CartContext';
import { formatARS } from '@/app/lib/formatcurrenci';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import Swal from 'sweetalert2';
import { useState, useEffect, useCallback } from 'react';

// 📞 NÚMERO DE LA RECEPCIONISTA (FIJO)
const NUMERO_RECEPCIONISTA = '5492224492051'; // +54 9 2224 49-2051 sin símbolos

export default function CartDrawer() {
  const { cart, removeFromCart, incrementQty, decrementQty, clearCart } = useCart();
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleIncrement = useCallback((id: string) => {
    incrementQty(id);
  }, [incrementQty]);

  const handleDecrement = useCallback((id: string) => {
    decrementQty(id);
  }, [decrementQty]);

  const handleClearCart = () => {
    Swal.fire({
      title: '¿Vaciar carrito?',
      text: 'Se eliminarán todos los productos seleccionados',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, vaciar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: {
        confirmButton: 'bg-[#0D4A6B] text-white',
        cancelButton: 'bg-gray-300 text-gray-700'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        clearCart();
        if (isMobile) setIsOpen(false);
        Swal.fire('Carrito vaciado', 'Los productos han sido eliminados', 'success');
      }
    });
  };

  if (!cart.length) return null;

  const total = cart.reduce((acc: number, p: any) => {
    const price = p.precioOferta && p.precioOferta < p.precioMayorista
      ? p.precioOferta
      : p.precioMayorista;
    return acc + price * p.qty;
  }, 0);

  /* ===============================
     📱 FUNCIÓN: ABRIR WHATSAPP CON NÚMERO FIJO
  =============================== */
 /* ===============================
   📱 FUNCIÓN: ABRIR WHATSAPP CON NÚMERO FIJO
=============================== */
const openWhatsApp = (clienteNombre: string, clienteTelefono: string, message: string): boolean => {
  // ✅ Número de la recepcionista (YA PROCESADO)
  const phoneClean = NUMERO_RECEPCIONISTA; // '5492224492051'
  
  // ✅ Codificar mensaje para URL
  const messageEncoded = encodeURIComponent(message);
  
  // ✅ URL CORREGIDA: sin espacios
  const waURL = `https://wa.me/${phoneClean}?text=${messageEncoded}`;
  
  // ✅ Detectar iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  try {
    if (isIOS) {
      // 🍎 iOS: Usar location.href (más confiable que window.open)
      window.location.href = waURL;
    } else {
      // 🤖 Android/Desktop: Abrir en nueva pestaña como el botón flotante
      window.open(waURL, '_blank', 'noopener,noreferrer');
    }
    return true;
  } catch (e) {
    console.error('Error abriendo WhatsApp:', e);
    // Fallback final: navegación directa
    window.location.href = waURL;
    return false;
  }
};
  /* ===============================
     ✅ CONFIRMAR PEDIDO - FLUJO COMPLETO
  =============================== */
  const confirmOrder = async () => {
    // 🔹 PASO 0: Mostrar formulario (datos DEL CLIENTE)
    const { value: form } = await Swal.fire({
      title: 'Confirmar pedido',
      html: `
        <input id="razonSocial" class="swal2-input" placeholder="Razón Social *" autocomplete="organization" required>
        <input id="telefono" class="swal2-input" placeholder="Tu WhatsApp (ej: 1112345678) *" autocomplete="tel" inputmode="tel" required>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const razonSocial = (document.getElementById('razonSocial') as HTMLInputElement)?.value.trim();
        const telefono = (document.getElementById('telefono') as HTMLInputElement)?.value.trim();

        if (!razonSocial || !telefono) {
          Swal.showValidationMessage('⚠️ Completá razón social y WhatsApp');
          return false;
        }
        if (telefono.replace(/\D/g, '').length < 10) {
          Swal.showValidationMessage('⚠️ Ingresá un teléfono válido');
          return false;
        }
        return { razonSocial, telefono };
      },
    });

    if (!form) return;

    // 🔹 PASO 1: Armar mensaje (incluye datos del cliente para que la recepcionista lo vea)
    const itemsResumen = cart.map((p: any) => {
      const precio = p.precioOferta && p.precioOferta < p.precioMayorista 
        ? p.precioOferta 
        : p.precioMayorista;
      return `• ${p.nombre} x${p.qty} - ${formatARS(precio * p.qty)}`;
    }).join('\n');

    const mensajeTexto = `* NUEVO PEDIDO WEB - El Vaquiano*

 *Cliente:* ${form.razonSocial}
 *Contacto:* ${form.telefono}

* Productos:*
${itemsResumen}

* Total:* ${formatARS(total)}

_Este pedido fue generado desde nuestra web. Por favor, confirmá la compra respondiendo este mensaje._`;

    // 🔹 PASO 2: Abrir WhatsApp AL NÚMERO DE LA RECEPCIONISTA
    const whatsappOpened = openWhatsApp(form.razonSocial, form.telefono, mensajeTexto);

    // 🔹 PASO 3: Guardar pedido en backend (con datos del cliente)
    try {
      const res = await fetch('/api/gestion/presupuestos/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cliente: { 
            razonSocial: form.razonSocial, 
            telefono: form.telefono 
          }, 
          cart 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el presupuesto');
      }

      // ✅ Éxito: vaciar carrito y mostrar confirmación
      clearCart();
      
      Swal.fire({
        title: '✅ Pedido registrado',
        html: `
          <p><strong>Presupuesto #${data._id}</strong> guardado correctamente.</p>
          <p class="text-sm text-gray-500 mt-2">
            ${!whatsappOpened 
              ? '⚠️ WhatsApp no se abrió automáticamente. Tocá el botón para enviar.' 
              : 'Revisá WhatsApp para completar el envío del mensaje a la recepcionista.'}
          </p>
        `,
        icon: 'success',
        confirmButtonText: !whatsappOpened ? '📱 Abrir WhatsApp ahora' : 'Entendido',
        showCancelButton: !whatsappOpened,
        cancelButtonText: 'Cerrar',
      }).then((result) => {
        if (result.isConfirmed && !whatsappOpened) {
          openWhatsApp(form.razonSocial, form.telefono, mensajeTexto);
        }
      });

      if (isMobile) setIsOpen(false);

    } catch (err: any) {
      // ⚠️ Error en backend
      Swal.fire({
        title: '⚠️ Atención',
        html: `
          <p>WhatsApp se abrió, pero hubo un error al guardar tu pedido en nuestro sistema.</p>
          <p class="text-sm text-gray-500 mt-2"><strong>Detalle:</strong> ${err.message}</p>
        `,
        icon: 'warning',
        confirmButtonText: '🔄 Reintentar',
        showCancelButton: true,
        cancelButtonText: 'Ir a WhatsApp igual',
      }).then((result) => {
        if (result.isConfirmed) {
          confirmOrder();
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          openWhatsApp(form.razonSocial, form.telefono, mensajeTexto);
        }
      });
    }
  };

  /* ===============================
     📱 COMPONENTES UI
  =============================== */
  const MobileCartButton = () => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-[#0D4A6B] border-2 border-[#1A5A7A] shadow-2xl flex items-center justify-center text-white hover:bg-[#1A5A7A] transition-colors duration-200"
      aria-label="Abrir carrito"
    >
      <div className="text-center">
        <span className="text-2xl">🛒</span>
        {cart.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 bg-[#FFB81C] text-[#0D4A6B] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
          >
            {cart.length}
          </motion.span>
        )}
      </div>
    </motion.button>
  );

  const CartContent = () => (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`fixed ${
        isMobile 
          ? 'left-1/2 -translate-x-1/2 bottom-0 w-[92%] max-w-md rounded-t-3xl rounded-b-none' 
          : 'bottom-6 right-6 w-80'
      } z-50 ${isMobile ? 'max-h-[75vh]' : ''} bg-[#0D4A6B] text-white border border-[#1A5A7A] shadow-2xl overflow-hidden`}
    >
      {isMobile && (
        <div className="w-full flex justify-center py-3 border-b border-[#1A5A7A]">
          <div className="w-12 h-1 bg-[#1A5A7A] rounded-full"></div>
        </div>
      )}

      <div className="px-5 pt-3 pb-3 border-b border-[#1A5A7A] flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base tracking-tight">
            🛒 Tu selección ({cart.length})
          </h3>
          {cart.length > 1 && (
            <button
              onClick={handleClearCart}
              className="text-xs text-[#A0D2E7] hover:text-white transition-colors mt-1 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Vaciar todo
            </button>
          )}
        </div>
        
        {isMobile && (
          <button
            onClick={() => setIsOpen(false)}
            className="text-[#A0D2E7] hover:text-white transition-colors text-lg"
            aria-label="Cerrar carrito"
          >
            ✕
          </button>
        )}
      </div>

      <div className="px-3 max-h-[40vh] overflow-y-auto">
        <LayoutGroup>
          {cart.map((p: any) => (
            <motion.div
              key={p._id}
              layout
              className="flex items-start justify-between py-3 px-2 border-b border-[#1A5A7A]/30 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.nombre}</p>
                <p className="text-xs text-[#A0D2E7] mt-0.5">
                  x{p.qty} · {formatARS(
                    p.precioOferta && p.precioOferta < p.precioMayorista
                      ? p.precioOferta
                      : p.precioMayorista
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1.5 ml-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDecrement(p._id)}
                  className="w-6 h-6 rounded-full bg-[#1A5A7A] text-white hover:bg-[#2A6A8A] text-sm flex items-center justify-center"
                  aria-label="Disminuir"
                >
                  −
                </motion.button>

                <motion.span
                  key={p.qty}
                  initial={{ scale: 1 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="text-xs text-[#A0D2E7] min-w-[18px] text-center font-medium"
                >
                  {p.qty}
                </motion.span>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleIncrement(p._id)}
                  disabled={p.qty >= p.stockTotal}
                  className={`w-6 h-6 rounded-full text-sm flex items-center justify-center
                      ${p.qty >= p.stockTotal
                      ? 'bg-gray-400 cursor-not-allowed opacity-60'
                      : 'bg-[#1A5A7A] hover:bg-[#2A6A8A]'
                    }`}
                  aria-label="Aumentar"
                >
                  +
                </motion.button>
              </div>
            </motion.div>
          ))}
        </LayoutGroup>
      </div>

      <div className="px-5 py-3 bg-[#0B3A52] border-t border-[#1A5A7A]">
        <div className="flex justify-between font-semibold text-sm mb-3">
          <span>Total</span>
          <span className="text-[#FFB81C] text-lg">{formatARS(total)}</span>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={confirmOrder}
          className="w-full bg-[#FFB81C] hover:bg-[#E5A50D] text-[#0D4A6B] py-3 rounded-lg text-sm font-bold transition-colors duration-200 shadow-lg"
        >
          Confirmar pedido vía WhatsApp
        </motion.button>

        {isMobile && (
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 text-[#A0D2E7] text-sm hover:text-white transition-colors py-2 border border-[#1A5A7A] rounded-lg"
            >
              ← Seguir eligiendo
            </button>
            {cart.length > 1 && (
              <button
                onClick={handleClearCart}
                className="flex-1 text-[#FF6B6B] text-sm hover:text-[#FF5252] transition-colors py-2 border border-[#1A5A7A] rounded-lg"
              >
                🗑️ Vaciar
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  const MobileOverlay = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.5 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsOpen(false);
        }
      }}
      className="fixed inset-0 z-40 bg-black cursor-pointer"
    />
  );

  return (
    <>
      {isMobile ? (
        <>
          <MobileCartButton />
          <AnimatePresence mode="wait">
            {isOpen && (
              <>
                <MobileOverlay key="overlay" />
                <CartContent key="cart" />
              </>
            )}
          </AnimatePresence>
        </>
      ) : (
        <CartContent />
      )}
    </>
  );
}