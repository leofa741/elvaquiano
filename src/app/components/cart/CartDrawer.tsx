'use client';

import { useCart } from '@/app/context/CartContext';
import { formatARS } from '@/app/lib/formatcurrenci';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import Swal from 'sweetalert2';
import { useState, useEffect, useCallback } from 'react';

// 📞 NÚMERO DE LA RECEPCIONISTA (FIJO)
const NUMERO_RECEPCIONISTA = '5492224492051';

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
     📱 FUNCIÓN: ABRIR WHATSAPP
  =============================== */
  const openWhatsApp = (clienteNombre: string, clienteTelefono: string, message: string): boolean => {
    const phoneClean = NUMERO_RECEPCIONISTA;
    const messageEncoded = encodeURIComponent(message);
    const waURL = `https://wa.me/${phoneClean}?text=${messageEncoded}`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    try {
      if (isIOS) {
        window.location.href = waURL;
      } else {
        window.open(waURL, '_blank', 'noopener,noreferrer');
      }
      return true;
    } catch (e) {
      console.error('Error abriendo WhatsApp:', e);
      window.location.href = waURL;
      return false;
    }
  };

  /* ===============================
     ✅ CONFIRMAR PEDIDO - FLUJO ACTUALIZADO
  =============================== */
  const confirmOrder = async () => {
    // 🔹 1. Cargar datos guardados (opcional, para UX)
    const savedClient = typeof window !== 'undefined'
      ? localStorage.getItem('cliente_online')
      : null;
    const clientData = savedClient ? JSON.parse(savedClient) : null;

    // 🔹 2. Mostrar formulario con SweetAlert2
    const { value: form } = await Swal.fire<{
      nombre: string;
      direccion: string;
      telefono: string;
    }>({
      title: 'Confirmar pedido',
      html: `
      <input id="nombre" class="swal2-input" placeholder="Nombre y Apellido *" autocomplete="name" required value="${clientData?.nombre || ''}">
      <input id="direccion" class="swal2-input" placeholder="Dirección de entrega *" autocomplete="street-address" required value="${clientData?.direccion || ''}">
      <input id="telefono" class="swal2-input" placeholder="Tu WhatsApp (ej: 1112345678) *" autocomplete="tel" inputmode="tel" required value="${clientData?.telefono || ''}">
    `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        const nombre = (document.getElementById('nombre') as HTMLInputElement)?.value.trim();
        const direccion = (document.getElementById('direccion') as HTMLInputElement)?.value.trim();
        const telefono = (document.getElementById('telefono') as HTMLInputElement)?.value.trim();

        if (!nombre || !direccion || !telefono) {
          Swal.showValidationMessage('⚠️ Completá nombre, dirección y WhatsApp');
          return false;
        }
        if (telefono.replace(/\D/g, '').length < 10) {
          Swal.showValidationMessage('⚠️ Ingresá un teléfono válido');
          return false;
        }
        return { nombre, direccion, telefono };
      },
    });

    // Si el usuario cancela el formulario
    if (!form) return;

    // 🔹 3. Mostrar loading modal (usamos Swal.showLoading() directamente)
    Swal.fire({
      title: 'Procesando pedido...',
      text: 'Generando presupuesto en nuestro sistema',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // 🔹 4. INTENTO DE GUARDADO CON TIMEOUT (AbortController)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/gestion/presupuestos/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: {
            nombre: form.nombre,
            direccion: form.direccion,
            telefono: form.telefono
          },
          cart,
          // 👇 ID temporal para trazabilidad en caso de error
          tempId: typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Error del servidor: ${res.status}`);
      }

      // ✅ ÉXITO: Cerramos el loading con Swal.close() (método estático)
      Swal.close();

      const presupuestoId = data._id;

      // 🔹 5. ARMAR MENSAJE CON EL ID REAL
      const itemsResumen = cart.map((p: any) => {
        const precio = p.precioOferta && p.precioOferta < p.precioMayorista
          ? p.precioOferta
          : p.precioMayorista;
        return `• ${p.nombre} x${p.qty} - ${formatARS(precio * p.qty)}`;
      }).join('\n');

 const mensajeTexto = `* NUEVO PEDIDO WEB - El Vaquiano *
*Presupuesto #:* ${presupuestoId}

*Cliente:* ${form.nombre}
*Dirección:* ${form.direccion}
*Contacto:* ${form.telefono}

* Productos:*
${itemsResumen}

* Total:* ${formatARS(total)}

──────────────────
🕒 *Horarios de atención:*
Lun-Vie: 8:00-16:00 | Sáb: 9:00-13:00

📍 *Retiro en tienda:* 
Mendoza 194, San Vicente, Bs. As.

💬 _Respondé a este mensaje para confirmar o consultar._
──────────────────
*El Vaquiano* - Calidad y tradición 🧉
${typeof window !== 'undefined' ? window.location.origin : 'https://elvaquiano.com.ar'}`;

      // 🔹 6. GUARDAR DATOS DEL CLIENTE EN LOCALSTORAGE (UX)
      if (typeof window !== 'undefined') {
        localStorage.setItem('cliente_online', JSON.stringify(form));
      }

      // 🔹 7. ABRIR WHATSAPP (ahora es seguro, lo crítico ya está guardado)
      const whatsappOpened = openWhatsApp(form.nombre, form.telefono, mensajeTexto);

      // 🔹 8. LIMPIAR CARRITO Y MOSTRAR ÉXITO
      clearCart();

      Swal.fire({
        title: '✅ ¡Todo listo!',
        html: `<p>Tu pedido <strong>#${presupuestoId}</strong> está registrado.</p>
             <p class="text-sm text-gray-600 mt-2">Revisá WhatsApp para enviar el mensaje a la recepcionista.</p>`,
        icon: 'success',
        confirmButtonText: whatsappOpened ? 'Entendido' : '📱 Abrir WhatsApp',
        showCancelButton: !whatsappOpened,
        cancelButtonText: 'Cerrar',
      }).then((result) => {
        if (result.isConfirmed && !whatsappOpened) {
          openWhatsApp(form.nombre, form.telefono, mensajeTexto);
        }
        if (isMobile) setIsOpen(false);
      });

    } catch (err: any) {
      // ❌ FALLO CRÍTICO: Cerramos loading y NO abrimos WhatsApp
      Swal.close();

      console.error('Error crítico en pedido:', err);

      // Si es timeout de red (AbortError)
      if (err.name === 'AbortError') {
        Swal.fire({
          title: '⚠️ Conexión lenta',
          text: 'No pudimos confirmar tu pedido con el servidor. Por favor revisa tu internet e intenta de nuevo.',
          icon: 'warning',
          confirmButtonText: 'Reintentar',
          showCancelButton: true,
          cancelButtonText: 'Cancelar',
        }).then((r) => {
          if (r.isConfirmed) confirmOrder();
        });
        return;
      }

      // Error genérico del backend o red
      Swal.fire({
        title: '❌ Error de registro',
        html: `<p>No se pudo guardar el pedido en nuestro sistema.</p>
             <p class="text-xs text-gray-500 mt-2">Detalles: ${err.message || 'Error desconocido'}</p>
             <p class="text-sm mt-3 font-bold text-red-600">⚠️ No se abrió WhatsApp para evitar pedidos sin registrar.</p>`,
        icon: 'error',
        confirmButtonText: '🔄 Intentar de nuevo',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) confirmOrder();
      });
    }
  };
  /* ===============================
     📱 COMPONENTES UI (sin cambios)
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
      className={`fixed ${isMobile
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