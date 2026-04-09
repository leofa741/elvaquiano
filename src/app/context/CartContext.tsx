// src/app/context/CartContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation'; // 👈 IMPORTANTE para App Router

const CartContext = createContext<any>(null);

export function CartProvider({ children }: any) {
  const [cart, setCart] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname(); // 👈 Detecta cambios de ruta

  // 🔹 FUNCIÓN CENTRAL: Leer carrito desde localStorage (fuente de verdad)
  const loadCartFromStorage = () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Solo actualizamos si es diferente para evitar re-renders innecesarios
        setCart(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
      }
    } catch (error) {
      console.error('Error cargando carrito:', error);
    }
  };

  // 1️⃣ Cargar al montar por primera vez
  useEffect(() => {
    loadCartFromStorage();
    setIsLoaded(true);
  }, []);

  // 2️⃣ 🔥 RE-SINCRONIZAR cuando cambia la ruta (navegación con flecha atrás/adelante)
  useEffect(() => {
    if (isLoaded) {
      // Pequeño delay para asegurar que la navegación terminó
      const timer = setTimeout(() => {
        loadCartFromStorage();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [pathname, isLoaded]); // 👈 CLAVE: se ejecuta en cada cambio de URL

  // 3️⃣ Guardar en localStorage cuando el carrito cambia
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  // 4️⃣ Escuchar evento 'storage' para sincronización entre pestañas
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cart') {
        loadCartFromStorage();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isLoaded]);

  // 5️⃣ 🔥 Bonus: Actualizar cuando el usuario regresa a la pestaña (focus)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleFocus = () => {
      loadCartFromStorage();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isLoaded]);

  // 🔹 Función helper para notificaciones de stock (tu código original)
  const showStockNotification = (message: string, type: 'warning' | 'info' = 'warning') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in ${
      type === 'warning' 
        ? 'bg-amber-500 text-white' 
        : 'bg-blue-500 text-white'
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

  // 🔹 AGREGAR AL CARRITO (tu lógica original, sin cambios)
  const addToCart = (product: any, qtyToAdd: number = 1) => {
    setCart(prev => {
      const existing = prev.find((p: any) => p._id === product._id);
      const stockDisponible = product.stockTotal || 0;

      if (existing) {
        const espacioRestante = stockDisponible - existing.qty;
        if (espacioRestante <= 0) {
          showStockNotification('⚠️ Ya agregaste todo el stock disponible', 'info');
          return prev;
        }
        const cantidadAAgregar = Math.min(qtyToAdd, espacioRestante);
        if (cantidadAAgregar < qtyToAdd) {
          showStockNotification(`⚠️ Solo hay ${stockDisponible} unidades disponibles. Se agregaron ${cantidadAAgregar}.`);
        }
        return prev.map((p: any) =>
          p._id === product._id ? { ...p, qty: p.qty + cantidadAAgregar } : p
        );
      } else {
        const qtyFinal = Math.min(qtyToAdd, stockDisponible);
        if (qtyFinal < qtyToAdd) {
          showStockNotification(`⚠️ Solo hay ${stockDisponible} unidades disponibles. Se agregaron ${qtyFinal}.`);
        }
        return [
          ...prev,
          { ...product, qty: qtyFinal, stockTotal: stockDisponible }
        ];
      }
    });
  };

  // 🔹 INCREMENTAR CANTIDAD (botón +)
  const incrementQty = (id: string) => {
    setCart(prev =>
      prev.map(p => {
        if (p._id !== id) return p;
        if (p.qty >= (p.stockTotal || 0)) {
          showStockNotification('✅ Stock máximo alcanzado para este producto', 'info');
          return p;
        }
        return { ...p, qty: p.qty + 1 };
      })
    );
  };

  // 🔹 DECREMENTAR CANTIDAD (botón −)
  const decrementQty = (id: string) => {
    setCart(prev =>
      prev
        .map(p => p._id === id ? { ...p, qty: Math.max(0, p.qty - 1) } : p)
        .filter(p => p.qty > 0)
    );
  };

  // 🔹 ✨ NUEVO: ACTUALIZAR CANTIDAD MANUAL (para input numérico)
  const updateQty = (id: string, newQty: number, stockMax: number) => {
    // Validar y limitar la cantidad
    const finalQty = Math.max(1, Math.min(newQty, stockMax));
    
    setCart(prev => {
      // Si el producto existe, actualizamos su cantidad
      const exists = prev.some(p => p._id === id);
      if (exists) {
        return prev.map(p => 
          p._id === id ? { ...p, qty: finalQty } : p
        );
      }
      // Si no existe (caso edge), no hacemos nada
      return prev;
    });

    // Notificación opcional si se ajustó por stock
    if (newQty > stockMax && stockMax > 0) {
      showStockNotification(`⚠️ Se ajustó a ${stockMax} (máximo disponible)`, 'info');
    }
  };

  // 🔹 REMOVER PRODUCTO
  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p._id !== id));
  };

  // 🔹 VACIAR CARRITO
  const clearCart = () => {
    setCart([]);
  };

  // 🔹 CONTADOR DE ITEMS
  const getCartCount = () => cart.reduce((acc, item) => acc + item.qty, 0);

  // 🔹 CALCULAR TOTAL
  const getCartTotal = () => {
    return cart.reduce((acc: number, p: any) => {
      const price = p.precioOferta && p.precioOferta < p.precioMayorista
        ? p.precioOferta
        : p.precioMayorista;
      return acc + price * p.qty;
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoaded,
        addToCart,
        incrementQty,
        decrementQty,
        updateQty,        // 👈 NUEVO: expuesto para uso en componentes
        removeFromCart,
        clearCart,
        getCartCount,
        getCartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de un CartProvider');
  }
  return context;
};