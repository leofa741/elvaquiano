// src/app/context/CartContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext<any>(null);

export function CartProvider({ children }: any) {
  const [cart, setCart] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 🔹 Cargar carrito desde localStorage al iniciar
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cart');
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error cargando carrito:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 🔹 Guardar carrito en localStorage cuando cambia
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  // 🔹 Función helper para mostrar notificaciones de stock
  const showStockNotification = (message: string, type: 'warning' | 'info' = 'warning') => {
    // Creamos un toast simple sin dependencias externas
    const toast = document.createElement('div');
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in ${
      type === 'warning' 
        ? 'bg-amber-500 text-white' 
        : 'bg-blue-500 text-white'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animación de entrada
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translate(-50%, 0)';
    });
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, 20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // 🔹 AGREGAR AL CARRITO CON LÓGICA DE STOCK INTELIGENTE
  const addToCart = (product: any, qtyToAdd: number = 1) => {
    setCart(prev => {
      const existing = prev.find((p: any) => p._id === product._id);
      const stockDisponible = product.stockTotal || 0;

      // 📦 Si el producto ya está en el carrito
      if (existing) {
        const espacioRestante = stockDisponible - existing.qty;
        
        // No hay stock disponible para agregar
        if (espacioRestante <= 0) {
          showStockNotification('⚠️ Ya agregaste todo el stock disponible', 'info');
          return prev;
        }
        
        // Calculamos cuántos podemos agregar realmente
        const cantidadAAgregar = Math.min(qtyToAdd, espacioRestante);
        
        // Feedback si no pudimos agregar todo lo solicitado
        if (cantidadAAgregar < qtyToAdd) {
          showStockNotification(`⚠️ Solo hay ${stockDisponible} unidades disponibles. Se agregaron ${cantidadAAgregar}.`);
        }

        return prev.map((p: any) =>
          p._id === product._id
            ? { ...p, qty: p.qty + cantidadAAgregar }
            : p
        );
      } 
      
      // 📦 Producto nuevo: agregamos con qty limitada al stock disponible
      else {
        const qtyFinal = Math.min(qtyToAdd, stockDisponible);
        
        // Feedback si el stock era limitado
        if (qtyFinal < qtyToAdd) {
          showStockNotification(`⚠️ Solo hay ${stockDisponible} unidades disponibles. Se agregaron ${qtyFinal}.`);
        }

        return [
          ...prev,
          {
            ...product,
            qty: qtyFinal,
            stockTotal: stockDisponible // ✅ Guardamos el stock para validar después
          }
        ];
      }
    });
  };

  // 🔹 INCREMENTAR CANTIDAD (respetando stock máximo)
  const incrementQty = (id: string) => {
    setCart(prev =>
      prev.map(p => {
        if (p._id !== id) return p;
        
        // Verificar si ya llegó al límite de stock
        if (p.qty >= (p.stockTotal || 0)) {
          showStockNotification('✅ Stock máximo alcanzado para este producto', 'info');
          return p;
        }
        
        return { ...p, qty: p.qty + 1 };
      })
    );
  };

  // 🔹 DECREMENTAR CANTIDAD
  const decrementQty = (id: string) => {
    setCart(prev =>
      prev
        .map(p =>
          p._id === id ? { ...p, qty: Math.max(0, p.qty - 1) } : p
        )
        .filter(p => p.qty > 0)
    );
  };

  // 🔹 REMOVER PRODUCTO DEL CARRITO
  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p._id !== id));
  };

  // 🔹 VACIAR CARRITO COMPLETO
  const clearCart = () => {
    setCart([]);
  };

  // 🔹 OBTENER CANTIDAD TOTAL DE ITEMS (para el badge del carrito)
  const getCartCount = () => {
    return cart.reduce((acc, item) => acc + item.qty, 0);
  };

  // 🔹 OBTENER TOTAL DEL CARRITO (con precios de oferta si aplican)
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