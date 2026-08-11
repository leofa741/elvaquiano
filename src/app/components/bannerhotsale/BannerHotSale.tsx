'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Tag, Clock, ArrowRight } from 'lucide-react';

// Componente de temporizador con urgencia semanal (estilo supermercado)
const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Calcula automáticamente el próximo domingo a las 23:59:59 y que reinicie el contador cada semana
    const getNextSunday = () => {
      const now = new Date();
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7));
      nextSunday.setHours(23, 59, 59, 999);
      return nextSunday;  
    };

    const targetDate = getNextSunday();

    const updateTimer = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        // Reinicia el temporizador para la próxima semana
        const newTargetDate = getNextSunday();
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
      <Clock className="w-5 h-5 text-yellow-300 animate-pulse" />
      <div className="text-sm sm:text-base font-bold text-white tracking-wide">
        <span className="hidden sm:inline">La oferta termina en: </span>
        <span className="font-mono text-yellow-300">
          {String(timeLeft.days).padStart(2, '0')}d : {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
        </span>
      </div>
    </div>
  );
};

export default function BannerElVaquiano() {
  const [isVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      {/* Fondo con gradiente estilo "Folleto de Supermercado Premium" */}
      <div className="relative bg-gradient-to-br from-red-700 via-red-600 to-yellow-500 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
        
        {/* Patrón de fondo sutil (efecto de textura) */}
        <div className="absolute inset-0 opacity-10" 
             style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        {/* Overlay oscuro sutil para mejorar legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-6 sm:p-8 gap-6 sm:gap-8">
          
          {/* SECCIÓN IZQUIERDA: Mensaje Principal */}
          <div className="flex-1 text-center lg:text-left space-y-4">
            {/* Badge de confianza */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5">
              <ShoppingCart className="w-4 h-4 text-yellow-300" />
              <span className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider">
                Venta Mayorista y Minorista
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-sm">
              ¡PRECIOS DE <br className="hidden sm:block" />
              <span className="text-yellow-300">DISTRIBUIDORA!</span>
            </h2>
            
            <p className="text-base sm:text-lg text-white/90 max-w-md mx-auto lg:mx-0 font-medium">
              Con stock constante y entrega rápida, abastecé tu negocio con productos de calidad profesional.
              <span className="block mt-1 text-yellow-200 font-bold">Llevá más, pagá menos.</span>
            </p>

        
          </div>

          {/* SECCIÓN DERECHA: Urgencia y Descuento (Estilo Etiqueta de Precio) */}
          <div className="flex flex-col items-center gap-4 w-full lg:w-auto">
            
            {/* Etiqueta de Descuento Principal */}
            <div className="relative bg-yellow-400 text-red-800 p-6 rounded-2xl shadow-xl transform rotate-1 hover:rotate-0 transition-transform duration-300 border-4 border-dashed border-red-700/30 text-center min-w-[200px]">
              <div className="absolute -top-3 -right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md animate-bounce">
                ¡HOT!
              </div>
              <Tag className="w-8 h-8 mx-auto mb-1 text-red-700" />
              <p className="text-4xl sm:text-5xl font-black leading-none">%</p>
              <p className="text-sm font-bold uppercase tracking-widest mt-1">De Descuento</p>
              <p className="text-xs font-semibold text-red-900 mt-2">En productos seleccionados</p>
            </div>

         
           
          </div>

        </div>
      </div>
    </div>
  );
}