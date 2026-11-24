'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function ChristmasWelcomeConfetti() {
  useEffect(() => {
    // ✅ DESCOMENTA ESTAS 3 LÍNEAS cuando quieras que solo salga UNA vez por sesión
    // const hasSeenWelcome = sessionStorage.getItem('hasSeenChristmasWelcome');
    // if (!hasSeenWelcome) {
    //   sessionStorage.setItem('hasSeenChristmasWelcome', 'true');

      // 🎨 Paleta Premium Navideña: Oro, Plata, Rojo Rubí, Verde Pino, Blanco Nieve
      const premiumColors = ['#FFD700', '#E5E4E2', '#C41E3A', '#014421', '#FFFAFA'];

      const duration = 5000; // 5 segundos de magia
      const end = Date.now() + duration;

      // ❄️ CAPA 1: "Nieve Mágica" cayendo suavemente desde arriba
      const snowDefaults: confetti.Options = {
        colors: premiumColors,
        shapes: ['circle'] as confetti.Shape[], // Círculos = copos de nieve/brillos
        scalar: 0.6, // Pequeños y delicados
        gravity: 0.5, // Caída muy lenta y suave (flota)
        drift: 1.2,   // Efecto de viento lateral suave
        ticks: 600,   // Permanecen más tiempo en pantalla
        disableForReducedMotion: true,
      };

      // 🎉 CAPA 2: "Brindis Elegante" desde las esquinas
      const burstDefaults: confetti.Options = {
        colors: premiumColors,
        shapes: ['square', 'circle'] as confetti.Shape[],
        scalar: 0.7,
        gravity: 0.8,
        drift: 0.5,
        ticks: 400,
        disableForReducedMotion: true,
      };

      const frame = () => {
        // 1. Lluvia continua y sutil desde el centro superior
        confetti({
          ...snowDefaults,
          particleCount: 2, // Muy pocas partículas por frame para que sea delicado
          angle: 90,
          spread: 180,
          origin: { x: 0.5, y: 0 }, // Centro arriba
        });

        // 2. Pequeñas explosiones elegantes desde las esquinas inferiores (intermitentes)
        // Usamos Math.random() para que no sea un chorro constante, sino "pops" elegantes
        if (Math.random() < 0.25) { 
          confetti({
            ...burstDefaults,
            particleCount: 12, // Un pequeño puñado, no una explosión masiva
            angle: 60,
            spread: 70,
            origin: { x: 0, y: 1 }, // Esquina inferior izquierda
          });
          confetti({
            ...burstDefaults,
            particleCount: 12,
            angle: 120,
            spread: 70,
            origin: { x: 1, y: 1 }, // Esquina inferior derecha
          });
        }

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    // }
  }, []);

  return null;
}