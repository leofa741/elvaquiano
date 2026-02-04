'use client';

import { useCart } from '@/app/context/CartContext';
import { formatARS } from '@/app/lib/formatcurrenci';
import { sendWhatsApp } from '@/app/lib/whatsApp';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { useState, useEffect } from 'react';

export default function CartDrawer() {
  const { cart, removeFromCart, incrementQty, decrementQty } = useCart();
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!cart.length) return null;

  const total = cart.reduce((acc: any, p: any) => {
    const price = p.precioOferta && p.precioOferta < p.precioMayorista
      ? p.precioOferta
      : p.precioMayorista;
    return acc + price * p.qty;
  }, 0);

  const confirmOrder = async () => {
    const { value: form } = await Swal.fire({
      title: 'Confirmar pedido',
      html: `
        <input id="razonSocial" class="swal2-input" placeholder="Razón Social">
        <input id="telefono" class="swal2-input" placeholder="WhatsApp">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      preConfirm: () => {
        const razonSocial = (document.getElementById('razonSocial') as HTMLInputElement).value;
        const telefono = (document.getElementById('telefono') as HTMLInputElement).value;

        if (!razonSocial || !telefono) {
          Swal.showValidationMessage('Completá razón social y WhatsApp');
          return;
        }

        return { razonSocial, telefono };
      },
    });

    if (!form) return;

    try {
      const res = await fetch('/api/gestion/presupuestos/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: form,
          cart,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire('Error', data.error || 'No se pudo crear el presupuesto', 'error');
        return;
      }

      sendWhatsApp({
        cart,
        telefono: form.telefono,
        razonSocial: form.razonSocial,
        presupuestoId: data._id,
        totalPresupuesto: data.total,
      });

      Swal.fire(
        'Pedido enviado',
        'Tu pedido fue recibido, te contactamos a la brevedad.',
        'success'
      );

      // Cerrar carrito después de confirmar en móvil
      if (isMobile) {
        setIsOpen(false);
      }

    } catch (err) {
      Swal.fire('Error', 'Error de conexión con el servidor', 'error');
    }
  };

  // Botón flotante para móviles
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

  // Carrito completo
  const CartContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed ${
        isMobile ? 'inset-0 bottom-0 rounded-t-2xl' : 'bottom-6 right-6 w-80'
      } z-50 ${isMobile ? 'max-h-[85vh]' : ''} bg-[#0D4A6B] text-white border border-[#1A5A7A] shadow-2xl overflow-hidden`}
    >
      {/* Header con botón de cerrar en móvil */}
      <div className="px-5 pt-5 pb-3 border-b border-[#1A5A7A] flex items-center justify-between">
        <h3 className="font-semibold text-base tracking-tight">
          🛒 Tu selección ({cart.length})
        </h3>
        {isMobile && (
          <button
            onClick={() => setIsOpen(false)}
            className="text-[#A0D2E7] hover:text-white transition-colors"
            aria-label="Cerrar carrito"
          >
            ✕
          </button>
        )}
      </div>

      {/* Items */}
      <div className="px-2 max-h-60 overflow-y-auto">
        <AnimatePresence>
          {cart.map((p: any) => (
            <motion.div
              key={p._id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start justify-between py-3 px-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.nombre}</p>
                <p className="text-xs text-[#A0D2E7] mt-1">
                  x{p.qty} · {formatARS(
                    p.precioOferta && p.precioOferta < p.precioMayorista
                      ? p.precioOferta
                      : p.precioMayorista
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => decrementQty(p._id)}
                  className="w-6 h-6 rounded-full bg-[#1A5A7A] text-white hover:bg-[#2A6A8A]"
                  aria-label="Disminuir"
                >
                  −
                </button>

                <span className="text-xs text-[#A0D2E7] min-w-[16px] text-center">
                  {p.qty}
                </span>

                <button
                  onClick={() => incrementQty(p._id)}
                  disabled={p.qty >= p.stockTotal}
                  className={`w-6 h-6 rounded-full
                      ${p.qty >= p.stockTotal
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#1A5A7A] hover:bg-[#2A6A8A]'
                    }`}
                  aria-label="Aumentar"
                >
                  +
                </button>

                <span className="text-xs text-[#A0D2E7] ml-2">
                  · {formatARS(
                    p.precioOferta && p.precioOferta < p.precioMayorista
                      ? p.precioOferta
                      : p.precioMayorista
                  )}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Total + CTA */}
      <div className="px-5 py-4 bg-[#0B3A52] border-t border-[#1A5A7A]">
        <div className="flex justify-between font-semibold text-sm mb-3">
          <span>Total</span>
          <span className="text-[#FFB81C]">{formatARS(total)}</span>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={confirmOrder}
          className="w-full bg-[#FFB81C] hover:bg-[#E5A50D] text-[#0D4A6B] py-2.5 rounded-lg text-sm font-bold transition-colors duration-200 shadow-lg"
        >
          Confirmar pedido vía WhatsApp
        </motion.button>

        {isMobile && (
          <button
            onClick={() => setIsOpen(false)}
            className="w-full mt-2 text-[#A0D2E7] text-sm hover:text-white transition-colors"
          >
            ← cerrar y Seguir eligiendo
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      {/* En móvil: botón flotante + carrito modal */}
      {isMobile ? (
        <>
          <MobileCartButton />
          <AnimatePresence>
            {isOpen && <CartContent />}
          </AnimatePresence>
        </>
      ) : (
        // En escritorio: carrito fijo como antes
        <CartContent />
      )}
    </>
  );
}