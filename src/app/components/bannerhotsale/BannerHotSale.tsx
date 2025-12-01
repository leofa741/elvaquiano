'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Componente de temporizador
const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date('2025-05-17T23:59:59'); // Fecha final del Hot Sale

    const updateTimer = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
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
    <div className="text-sm sm:text-base text-white">
      Quedan: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
    </div>
  );
};

export default function BannerHotSale() {
  const [isVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative max-w-full px-4 sm:px-6 lg:px-8 my-6 mx-auto">
      {/* Fondo con gradiente */}
      <div className="relative bg-gradient-to-r from-red-500 via-yellow-400 to-red-500 rounded-3xl overflow-hidden shadow-xl h-auto sm:h-[280px] flex flex-col gap-4 sm:flex-row items-center justify-between p-4">
        {/* Overlay oscuro sutil */}
        <div className="absolute inset-0 bg-black opacity-10"></div>

        {/* Logo Hot Sale */}
        <div className="absolute top-4 left-4 z-20">
          <Image
            src="/img/hot-sale-emblem-clipart-design-illustration-free-png.webp"
            alt="Hot Sale Logo"
            width={100}
            height={100}
            className="w-24 sm:w-32 h-auto"
          />
        </div>

        {/* Descuento y fechas - ahora en la parte superior en móviles */}
        <div className="relative z-10 flex flex-col items-center sm:items-end justify-center w-full sm:w-auto gap-2">
          <span className="bg-yellow-400 text-red-700 font-extrabold text-lg sm:text-2xl px-4 py-1 rounded-lg shadow-lg animate-pulse">
            Hasta 30% OFF
          </span>
          <p className="text-xs sm:text-sm text-white text-center">12 al 17 de mayo</p>
          <CountdownTimer />
        </div>

        {/* Contenido izquierdo */}
        <div className="relative z-10 flex flex-col justify-center items-center sm:items-start text-center sm:text-left gap-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold  text-red-600">¡HOT SALE 2025!</h2>
          <p className="text-sm sm:text-base">
            Los mejores descuentos en tecnología están aquí. Aprovecha ofertas exclusivas por tiempo limitado.
          </p>
          <Link href="/ofertas">
            <button className="bg-white text-red-600 hover:bg-yellow-300 font-bold py-2 px-6 rounded-full shadow-md transition duration-300 transform hover:scale-105 mt-2">
              Ver Ofertas
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
