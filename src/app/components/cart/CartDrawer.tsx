'use client';

import { useCart } from '@/app/context/CartContext';
import { formatARS } from '@/app/lib/formatcurrenci';
import { sendWhatsApp } from '@/app/lib/whatsApp';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import Swal from 'sweetalert2';
import { useState, useEffect, useCallback } from 'react';

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

  // Memorizar funciones para evitar re-renders innecesarios
  const handleIncrement = useCallback((id: string) => {
    incrementQty(id);
  }, [incrementQty]);

  const handleDecrement = useCallback((id: string) => {
    decrementQty(id);
  }, [decrementQty]);

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
      {/* Handle para arrastrar en móviles */}
      {isMobile && (
        <div className="w-full flex justify-center py-3 border-b border-[#1A5A7A]">
          <div className="w-12 h-1 bg-[#1A5A7A] rounded-full"></div>
        </div>
      )}

      {/* Header con botón de cerrar en móvil */}
      <div className="px-5 pt-3 pb-3 border-b border-[#1A5A7A] flex items-center justify-between">
        <h3 className="font-semibold text-base tracking-tight">
          🛒 Tu selección ({cart.length})
        </h3>
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

      {/* Items - Usamos LayoutGroup para transiciones suaves sin re-renderizar */}
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

      {/* Total + CTA */}
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
          <button
            onClick={() => setIsOpen(false)}
            className="w-full mt-2.5 text-[#A0D2E7] text-sm hover:text-white transition-colors py-2"
          >
            ← cerrar y seguir eligiendo
          </button>
        )}
      </div>
    </motion.div>
  );

  // Overlay para móviles - evita cerrar al hacer click en los botones de cantidad
  const MobileOverlay = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.5 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        // Solo cerrar si se hace click directamente en el overlay, no en hijos
        if (e.target === e.currentTarget) {
          setIsOpen(false);
        }
      }}
      className="fixed inset-0 z-40 bg-black cursor-pointer"
    />
  );

  return (
    <>
      {/* En móvil: botón flotante + carrito modal con overlay */}
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
        // En escritorio: carrito fijo como antes
        <CartContent />
      )}
    </>
  );
}