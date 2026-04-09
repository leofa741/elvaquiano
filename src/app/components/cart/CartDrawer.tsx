'use client';

import { useCart } from '@/app/context/CartContext';
import { formatARS } from '@/app/lib/formatcurrenci';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import Swal from 'sweetalert2';
import { useState, useEffect, useCallback } from 'react';

// 📞 NÚMERO DE LA RECEPCIONISTA (FIJO) - SIN ESPACIOS
const NUMERO_RECEPCIONISTA = '5492224492051';

// ⏱️ TIEMPO DE BLOQUEO PARA PREVENIR DUPLICADOS (3 minutos)
const DUPLICATE_BLOCK_TIME = 3 * 60 * 1000;

export default function CartDrawer() {
  const { cart, removeFromCart, incrementQty, decrementQty, clearCart, updateQty } = useCart();
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // 🔹 ESTADOS PARA CONTROL DE CONEXIÓN Y DUPLICADOS
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  // 🔹 ✨ NUEVOS ESTADOS PARA EDICIÓN MANUAL DE CANTIDAD
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [manualQtyInput, setManualQtyInput] = useState<string>('');

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cart');
      const parsed = stored ? JSON.parse(stored) : [];
      console.log('🔄 Sync check:', {
        ruta: window.location.pathname,
        contexto: cart.length,
        storage: parsed.length,
        ok: cart.length === parsed.length
      });
    }
  }, [cart, pathname]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🔹 Cargar último pedido registrado al montar el componente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('last_presupuesto_id');
      const savedTime = localStorage.getItem('last_presupuesto_timestamp');

      if (savedId && savedTime) {
        const elapsed = Date.now() - parseInt(savedTime, 10);
        if (elapsed < DUPLICATE_BLOCK_TIME) {
          setLastSubmissionId(savedId);
        } else {
          localStorage.removeItem('last_presupuesto_id');
          localStorage.removeItem('last_presupuesto_timestamp');
        }
      }
    }
  }, []);

  const handleIncrement = useCallback((id: string) => {
    incrementQty(id);
  }, [incrementQty]);

  const handleDecrement = useCallback((id: string) => {
    decrementQty(id);
  }, [decrementQty]);

  // 🔹 ✨ NUEVA FUNCIÓN: Confirmar cantidad ingresada manualmente
  const handleConfirmManualQty = (productId: string, stockMax: number) => {
    const parsed = parseInt(manualQtyInput, 10);

    if (isNaN(parsed) || parsed < 1) {
      setEditingQtyId(null);
      setManualQtyInput('');
      return;
    }

    // Usar la función del contexto para actualizar
    updateQty(productId, parsed, stockMax);

    setEditingQtyId(null);
    setManualQtyInput('');
  };

  // 🔹 UTILIDAD: Verificar conexión real con timeout
  const checkInternetConnection = async (timeout = 3000): Promise<boolean> => {
    if (!navigator.onLine) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      await fetch('https://httpbin.org/ip', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  };

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
        localStorage.removeItem('last_presupuesto_id');
        localStorage.removeItem('last_presupuesto_timestamp');
        setLastSubmissionId(null);
        setRetryCount(0);

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
     📱 FUNCIÓN: ABRIR WHATSAPP (CORREGIDA)
  =============================== */
  const openWhatsApp = (clienteNombre: string, clienteTelefono: string, message: string): boolean => {
    const phoneClean = NUMERO_RECEPCIONISTA.replace(/\s+/g, '');
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
     ✅ CONFIRMAR PEDIDO - FLUJO COMPLETO Y CORREGIDO
  =============================== */
  const confirmOrder = async () => {
    if (isSubmitting) {
      Swal.fire({
        title: '⏳ Procesando...',
        text: 'Tu pedido ya se está enviando. Por favor espera.',
        icon: 'info',
        confirmButtonText: 'Entendido',
        timer: 3000,
        timerProgressBar: true
      });
      return;
    }

    // 🔹 PRE-CHECK: ¿Ya se registró este carrito recientemente?
    if (typeof window !== 'undefined') {
      const lastId = localStorage.getItem('last_presupuesto_id');
      const lastTime = localStorage.getItem('last_presupuesto_timestamp');

      if (lastId && lastTime) {
        const elapsed = Date.now() - parseInt(lastTime, 10);
        if (elapsed < DUPLICATE_BLOCK_TIME) {
          Swal.fire({
            title: '✅ Pedido ya registrado',
            html: `
    <p class="text-sm">Tu presupuesto <strong>#${lastId}</strong> ya está en nuestro sistema.</p>
    <p class="text-sm text-gray-800 mt-2">🚫 <strong>No vuelvas a intentar enviarlo</strong>, ya tenemos todo registrado.</p></br></br>
  <p class="text-sm text-green-700 font-bold mt-1"> <strong>Si necesitás modificar algo, contactanos por WhatsApp. </strong></p></br></br>
     <p class="text-sm text-red-800 font-bold mt-1">
  ⚠️ Si necesitás hacer un pedido nuevo clickea en <br/>
  <span class="text-red-900 underline">"🔄 Hacer pedido nuevo"</span>.
</p>
  `,
            icon: 'info',
            confirmButtonText: 'Entendido',
            showCancelButton: true,
            cancelButtonText: '📱 Ir a WhatsApp',
            showDenyButton: true,
            denyButtonText: '🔄 Hacer pedido nuevo',
            denyButtonColor: '#0D4A6B',
          }).then((r) => {
            if (r.isDismissed) {
              openWhatsApp('', '', `Hola, consulto por mi pedido #${lastId} ya registrado.`);
            } else if (r.isDenied) {
              localStorage.removeItem('last_presupuesto_id');
              localStorage.removeItem('last_presupuesto_timestamp');
              setLastSubmissionId(null);
              clearCart();
              setRetryCount(0);
              Swal.fire({
                title: '🛒 Carrito vaciado',
                text: 'Ya podés comenzar un nuevo pedido desde cero.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
            }
          });
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const savedClient = typeof window !== 'undefined'
        ? localStorage.getItem('cliente_online')
        : null;
      const clientData = savedClient ? JSON.parse(savedClient) : null;

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

      if (!form) {
        setIsSubmitting(false);
        setRetryCount(0);
        return;
      }

      Swal.fire({
        title: 'Procesando pedido...',
        text: 'Generando presupuesto en nuestro sistema',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

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

      Swal.close();
      const presupuestoId = data._id;

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

      if (typeof window !== 'undefined') {
        localStorage.setItem('cliente_online', JSON.stringify(form));
        localStorage.setItem('last_presupuesto_id', presupuestoId);
        localStorage.setItem('last_presupuesto_timestamp', Date.now().toString());
        setLastSubmissionId(presupuestoId);
      }

      const whatsappOpened = openWhatsApp(form.nombre, form.telefono, mensajeTexto);
      clearCart();
      setRetryCount(0);

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
      Swal.close();
      console.error('Error crítico en pedido:', err);

      // 🔹 Caso 1: Timeout o error de red
      if (err.name === 'AbortError' || err.message?.includes('Network') || err.message?.includes('Failed to fetch') || !navigator.onLine) {

        if (retryCount >= MAX_RETRIES) {
          Swal.fire({
            title: '⚠️ Límite de intentos',
            text: 'No pudimos conectar. Por favor, intentá más tarde o contactanos por WhatsApp.',
            icon: 'warning',
            confirmButtonText: 'Ir a WhatsApp'
          }).then(() => {
            openWhatsApp('', '', 'Hola, tuve problemas para enviar mi pedido desde la web.');
          });
          setIsSubmitting(false);
          return;
        }

        Swal.fire({
          title: '📡 Conexión inestable',
          html: `
            <p class="text-sm">No pudimos confirmar tu pedido con el servidor.</p>
            <p class="text-xs text-gray-500 mt-2">⚠️ <strong>Por favor revisá tu conexión a internet antes de intentar nuevamente.</strong></p>
            <p class="text-xs text-gray-400 mt-1">Si insistís sin conexión, podrías generar pedidos duplicados o perdidos.</p>
          `,
          icon: 'warning',
          confirmButtonText: '🔄 Verificar conexión y reintentar',
          cancelButtonText: 'Cancelar',
          showCancelButton: true,
          allowOutsideClick: false,
          preConfirm: async () => {
            const hasConnection = await checkInternetConnection();
            if (!hasConnection) {
              Swal.showValidationMessage('❌ Sin conexión. Revisá tu red o datos móviles.');
              return false;
            }
            return true;
          }
        }).then((r) => {
          if (r.isConfirmed) {
            setRetryCount(prev => prev + 1);
            confirmOrder();
          }
        });
        setIsSubmitting(false);
        return;
      }

      // 🔹 Caso 2: Error del backend
      if (err.message?.includes('Error del servidor')) {
        Swal.fire({
          title: '⚠️ Error del servidor',
          html: `
            <p>No pudimos procesar tu pedido en este momento.</p>
            <p class="text-xs text-gray-500 mt-2">Detalles: ${err.message}</p>
            <p class="text-sm mt-3 font-bold text-amber-600">💡 Esperá unos segundos e intentá de nuevo.</p>
          `,
          icon: 'warning',
          confirmButtonText: '🔄 Intentar de nuevo',
          showCancelButton: true,
          cancelButtonText: 'Cancelar',
        }).then((result) => {
          if (result.isConfirmed) confirmOrder();
        });
        setIsSubmitting(false);
        return;
      }

      // 🔹 Caso 3: Error genérico
      Swal.fire({
        title: '❌ Error de registro',
        html: `
          <p>No se pudo guardar el pedido en nuestro sistema.</p>
          <p class="text-xs text-gray-500 mt-2">Detalles: ${err.message || 'Error desconocido'}</p>
          <p class="text-sm mt-3 font-bold text-red-600">⚠️ No se abrió WhatsApp para evitar pedidos sin registrar.</p>
        `,
        icon: 'error',
        confirmButtonText: '🔄 Intentar de nuevo',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) confirmOrder();
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===============================
     📱 COMPONENTES UI
  =============================== */
  const MobileCartButton = () => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-[#0D4A6B] border-2 border-[#1A5A7A] shadow-2xl flex items-center justify-center text-white hover:bg-[#1A5A7A] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Abrir carrito"
      disabled={isSubmitting}
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
              className="text-xs text-[#A0D2E7] hover:text-white transition-colors mt-1 flex items-center gap-1 disabled:opacity-50"
              disabled={isSubmitting}
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
            className="text-[#A0D2E7] hover:text-white transition-colors text-lg disabled:opacity-50"
            aria-label="Cerrar carrito"
            disabled={isSubmitting}
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
                {/* BOTÓN MENOS */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDecrement(p._id)}
                  className="w-6 h-6 rounded-full bg-[#1A5A7A] text-white hover:bg-[#2A6A8A] text-sm flex items-center justify-center disabled:opacity-50"
                  aria-label="Disminuir"
                  disabled={isSubmitting}
                >
                  −
                </motion.button>

                {/* ✨ CANTIDAD: Input editable o texto con click */}
                <motion.div
                  key={`qty-${p._id}-${editingQtyId === p._id}`}
                  initial={{ scale: 1 }}
                  animate={{ scale: 1 }}
                  className="min-w-[40px] text-center"
                >
                  {editingQtyId === p._id ? (
                    // 👇 MODO EDICIÓN: Input numérico
                    <input
                      type="number"
                      min="1"
                      max={p.stockTotal || 999}
                      value={manualQtyInput}
                      onChange={(e) => setManualQtyInput(e.target.value)}
                      onBlur={() => handleConfirmManualQty(p._id, p.stockTotal || 999)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleConfirmManualQty(p._id, p.stockTotal || 999);
                          (e.target as HTMLInputElement).blur();
                        }
                        if (e.key === 'Escape') {
                          setEditingQtyId(null);
                          setManualQtyInput('');
                        }
                      }}
                      autoFocus
                      className="w-12 px-1 py-0.5 text-xs text-center bg-[#1A5A7A] text-white rounded border border-[#2A6A8A] focus:outline-none focus:ring-1 focus:ring-[#FFB81C] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  ) : (
                    // 👇 MODO NORMAL: Click para editar
                    <button
                      onClick={() => {
                        setEditingQtyId(p._id);
                        setManualQtyInput(p.qty.toString());
                      }}
                      className="text-xs text-[#f5d508] min-w-[18px] text-center font-medium 
             hover:text-white cursor-pointer transition-colors w-full
             animate-[pulse_2s_ease-in-out_infinite] hover:animate-none"
                      title="✏️ Click para editar cantidad"
                    >
                      {p.qty}
                    </button>
                  )}
                </motion.div>

                {/* BOTÓN MÁS */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleIncrement(p._id)}
                  disabled={p.qty >= p.stockTotal || isSubmitting}
                  className={`w-6 h-6 rounded-full text-sm flex items-center justify-center transition-colors
                      ${p.qty >= p.stockTotal || isSubmitting
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
          disabled={isSubmitting}
          className={`w-full py-3 rounded-lg text-sm font-bold transition-colors duration-200 shadow-lg flex items-center justify-center gap-2
            ${isSubmitting
              ? 'bg-gray-400 cursor-not-allowed text-gray-600'
              : 'bg-[#FFB81C] hover:bg-[#E5A50D] text-[#0D4A6B]'
            }`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-[#0D4A6B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando...
            </>
          ) : (
            'Confirmar pedido vía WhatsApp'
          )}
        </motion.button>

        {isMobile && (
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 text-[#A0D2E7] text-sm hover:text-white transition-colors py-2 border border-[#1A5A7A] rounded-lg disabled:opacity-50"
              disabled={isSubmitting}
            >
              ← Seguir eligiendo
            </button>
            {cart.length > 1 && (
              <button
                onClick={handleClearCart}
                className="flex-1 text-[#FF6B6B] text-sm hover:text-[#FF5252] transition-colors py-2 border border-[#1A5A7A] rounded-lg disabled:opacity-50"
                disabled={isSubmitting}
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
        if (e.target === e.currentTarget && !isSubmitting) {
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