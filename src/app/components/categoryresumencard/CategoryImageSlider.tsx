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
    
    // Cambia de imagen cada 3.5 segundos para un ritmo elegante
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imagenes.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [imagenes.length]);

  return (
    <div className="relative h-40 w-full bg-zinc-100 dark:bg-zinc-800/50">
      {imagenes.map((img, index) => (
        <div
          key={img}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <Image
            src={img}
            alt={`${categoria} - vista ${index + 1}`}
            fill
            // Efecto Ken Burns: zoom muy lento y suave
            className="object-cover transition-transform duration-[6000ms] ease-linear group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ))}
      
      {/* Indicadores (puntos) solo si hay más de 1 imagen */}
      {imagenes.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
          {imagenes.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex ? "w-4 bg-white shadow-sm" : "w-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
      
      {/* Overlay sutil para unificar el estilo */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent dark:from-black/40 z-10 pointer-events-none" />
    </div>
  );
}