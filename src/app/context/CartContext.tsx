'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext<any>(null);

export function CartProvider({ children }: any) {
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('cart');
    if (stored) setCart(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);

      if (existing) {
        if (existing.qty >= existing.stockTotal) {
          return prev; // 🚫 NO agrega más
        }

        return prev.map(p =>
          p._id === product._id
            ? { ...p, qty: p.qty + 1 }
            : p
        );
      }

      return [...prev, { ...product, qty: 1 }];
    });
  };

  const incrementQty = (id: string) => {
    setCart(prev =>
      prev.map(p => {
        if (p._id !== id) return p;

        if (p.qty >= p.stockTotal) {
          return p; // 🚫 stock máximo
        }

        return { ...p, qty: p.qty + 1 };
      })
    );
  };

  const decrementQty = (id: string) => {
    setCart(prev =>
      prev
        .map(p =>
          p._id === id ? { ...p, qty: p.qty - 1 } : p
        )
        .filter(p => p.qty > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p._id !== id));
  };

  // Agrega esta función al contexto
const clearCart = () => {
  setCart([]);
};



  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        incrementQty,
        decrementQty,
        removeFromCart,
        clearCart, // <-- Asegúrate de incluir clearCart en el valor del contexto
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
