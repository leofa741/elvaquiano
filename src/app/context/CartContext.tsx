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
    setCart((prev) => {
      const existing = prev.find(p => p._id === product._id);
      // console.log('Adding to cart:', product);
      if (existing) {
        return prev.map(p =>
          p._id === product._id
            ? { ...p, qty: p.qty + 1 }
            : p
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p._id !== id));
  };

  const incrementQty = (id: string) => {
    setCart(prev =>
      prev.map(p =>
        p._id === id ? { ...p, qty: p.qty + 1 } : p
      )
    );
  };

  const decrementQty = (id: string) => {
    setCart(prev =>
      prev
        .map(p =>
          p._id === id ? { ...p, qty: p.qty - 1 } : p
        )
        .filter(p => p.qty > 0) // si llega a 0, se elimina
    );
  };


  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart , incrementQty, decrementQty }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
