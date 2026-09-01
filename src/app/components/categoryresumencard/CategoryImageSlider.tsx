"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function CategoryImageSlider({ 
  imagenes, 
  categoria 
}: { 
  imagenes: string[]; 
  categoria: string; 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (imagenes.length <= 1) return;
    
    // Un poco más lento (4 segundos) para mayor elegancia
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imagenes.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [imagenes.length]);

  return (
    <div className="relative h-40 w-full overflow-hidden bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950">
      
      {/* 1. Efecto de luz de estudio sutil (Spotlight) para romper la rigidez */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-transparent dark:from-amber-900/20" />

      {imagenes.map((img, index) => (
        <div
          key={img}
          // 2. Transición combinada: opacidad + escala suave para efecto "respiración"
          className={`absolute inset-0 flex items-center justify-center p-5 transition-all duration-700 ease-in-out ${
            index === currentIndex 
              ? "opacity-100 z-10 scale-100" 
              : "opacity-0 z-0 scale-105"
          }`}
        >
          <div className="relative h-full w-full flex items-center justify-center">
            <Image
              src={img}
              alt={`${categoria} - vista ${index + 1}`}
              fill
              // 3. object-contain + drop-shadow para efecto de flotación premium
              className="object-contain drop-shadow-xl transition-transform duration-[8000ms] ease-out group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>
      ))}
      
      {/* Indicadores con brillo sutil */}
      {imagenes.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
          {imagenes.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === currentIndex 
                  ? "w-5 bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.6)]" 
                  : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      )}
      
      {/* 4. Degradado inferior para fundir la imagen con el texto (adiós a lo "cuadrado") */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/90 via-white/40 to-transparent dark:from-zinc-900/90 dark:via-zinc-900/40 z-10 pointer-events-none" />
    </div>
  );
}