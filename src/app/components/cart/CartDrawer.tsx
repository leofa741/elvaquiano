'use client';

import { useCart } from '@/app/context/CartContext';
import { formatARS } from '@/app/lib/formatcurrenci';
import { sendWhatsApp } from '@/app/lib/whatsApp';
import { motion, AnimatePresence } from 'framer-motion';


export default function CartDrawer() {
  const { cart, removeFromCart, incrementQty, decrementQty } = useCart();


  if (!cart.length) return null;

  const total = cart.reduce((acc: any, p: any) => {
    const price = p.precioOferta && p.precioOferta < p.precioMayorista
      ? p.precioOferta
      : p.precioMayorista;
    return acc + price * p.qty;
  }, 0);

  const confirmOrder = async () => {
    try {
      const res = await fetch('/api/gestion/pedidos/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Error al confirmar el pedido');
        return;
      }

      // ✅ Stock confirmado → recién ahora WhatsApp
      sendWhatsApp(cart);

    } catch (error) {
      alert('Error de conexión con el servidor');
    }
  };


  return (

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl bg-[#0D4A6B] text-white border border-[#1A5A7A] shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-[#1A5A7A]">
        <h3 className="font-semibold text-base tracking-tight">
          🛒 Tu selección
        </h3>
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

      </div>
    </motion.div>
  );
}