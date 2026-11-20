'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// revisar CartDrawer.tsx

const CartContext = createContext<any>(null);

export function CartProvider({ children }: any) {
  const [cart, setCart] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();

  const loadCartFromStorage = () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        const validCart = parsed.filter((item: any) => 
          item.qty && item.qty > 0 && !isNaN(item.qty)
        );
        
        if (validCart.length !== parsed.length) {
          localStorage.setItem('cart', JSON.stringify(validCart));
        }
        
        setCart(prev => JSON.stringify(prev) !== JSON.stringify(validCart) ? validCart : prev);
      }
    } catch (error) {
      console.error('Error cargando carrito:', error);
    }
  };

  useEffect(() => {
    loadCartFromStorage();
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => {
        loadCartFromStorage();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [pathname, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cart') loadCartFromStorage();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isLoaded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFocus = () => loadCartFromStorage();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isLoaded]);

  const showStockNotification = (message: string, type: 'warning' | 'info' = 'warning') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in ${
      type === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translate(-50%, 0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // ✅ SIN LÍMITE DE STOCK: Agrega la cantidad exacta que se pide
  const addToCart = (product: any, qtyToAdd: number = 1) => {
    setCart(prev => {
      const existing = prev.find((p: any) => p._id === product._id);
      if (existing) {
        return prev.map((p: any) =>
          p._id === product._id ? { ...p, qty: p.qty + qtyToAdd } : p
        );
      } else {
        return [...prev, { ...product, qty: qtyToAdd }];
      }
    });
  };

  // ✅ SIN LÍMITE DE STOCK: Incrementa libremente
  const incrementQty = (id: string) => {
    setCart(prev =>
      prev.map(p => {
        if (p._id !== id) return p;
        return { ...p, qty: p.qty + 1 };
      })
    );
  };

  const decrementQty = (id: string) => {
    setCart(prev =>
      prev
        .map(p => p._id === id ? { ...p, qty: Math.max(0, p.qty - 1) } : p)
        .filter(p => p.qty > 0)
    );
  };

  // ✅ SIN LÍMITE DE STOCK: Solo valida que sea un número entero >= 1
  const updateQty = (id: string, newQty: number) => {
    const finalQty = Math.max(1, Math.floor(newQty));
    setCart(prev => {
      const exists = prev.some(p => p._id === id);
      if (exists) {
        return prev.map(p => p._id === id ? { ...p, qty: finalQty } : p);
      }
      return prev;
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p._id !== id));
  };

  const clearCart = () => setCart([]);

  const getCartCount = () => cart.reduce((acc, item) => acc + item.qty, 0);

  const getCartTotal = () => {
    return cart.reduce((acc: number, p: any) => {
      const price = p.precioOferta && p.precioOferta < p.precioMayorista ? p.precioOferta : p.precioMayorista;
      return acc + price * p.qty;
    }, 0);
  };

  return (
    <CartContext.Provider value={{ cart, isLoaded, addToCart, incrementQty, decrementQty, updateQty, removeFromCart, clearCart, getCartCount, getCartTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de un CartProvider');
  return context;
};