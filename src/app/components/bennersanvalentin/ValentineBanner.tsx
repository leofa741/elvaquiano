'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';

interface ValentineBannerProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  backgroundImage?: string;
  logoSrc?: string;
  children?: ReactNode;
  gradientColors?: {
    from: string;
    via: string;
    to: string;
  };
  accentColor?: string;
}

interface Particle {
  id: number;
  width: number;
  height: number;
  top: number;
  left: number;
  delay: number;
}

interface Heart {
  id: number;
  size: number;
  top: number;
  left: number;
  delay: number;
  duration: number;
}

export default function ValentineBanner({
  title,
  subtitle,
  ctaText,
  onCtaClick,
  backgroundImage,
  logoSrc,
  children,
  gradientColors = {
    from: '#8B0000',
    via: '#650000',
    to: '#1a0000',
  },
  accentColor = '#ffff00',
}: ValentineBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    setMounted(true);

    // Generar partículas solo en el cliente
    const generatedParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      generatedParticles.push({
        id: i,
        width: Math.random() * 8 + 2,
        height: Math.random() * 8 + 2,
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 5,
      });
    }
    setParticles(generatedParticles);

    // Generar corazones solo en el cliente
    const generatedHearts: Heart[] = [];
    for (let i = 0; i < 8; i++) {
      generatedHearts.push({
        id: i,
        size: Math.random() * 50 + 20,
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: Math.random() * 15 + 10,
      });
    }
    setHearts(generatedHearts);
  }, []);

  return (
    <div className="valentine-banner relative w-full mx-auto overflow-hidden shadow-[0_20px_60px_-15px_rgba(139,0,0,0.6)] border border-amber-900/30 bg-clip-padding backdrop-filter backdrop-blur-sm">
      {/* Efecto de brillo superior */}
      <div className="top-glow absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent opacity-20 animate-pulse-slow" />

      {/* Efecto de brillo inferior */}
      <div className="bottom-glow absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent opacity-20 animate-pulse-slow-reverse" />

      {/* Fondo con efectos premium */}
      {backgroundImage ? (
        <div className="bg-image relative h-80 md:h-96 w-full" aria-hidden="true">
          <Image
            src={backgroundImage}
            alt="Fondo romántico premium"
            fill
            style={{ objectFit: 'cover' }}
            className="brightness-50 contrast-125 saturate-150"
            priority
          />
          <div className="overlay absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/60" />
        </div>
      ) : (
        <div
          className="gradient-bg h-80 md:h-96 relative overflow-hidden"
          aria-hidden="true"
        >
          {/* Gradiente principal premium */}
          <div
            className="main-gradient absolute inset-0 bg-gradient-to-br transition-all duration-700"
            style={{
              background: `linear-gradient(135deg, ${gradientColors.from} 0%, ${gradientColors.via} 50%, ${gradientColors.to} 100%)`,
            }}
          />

          {/* Partículas flotantes - solo renderizadas en el cliente */}
          {mounted && (
            <div className="particles absolute inset-0 opacity-15">
              {particles.map((particle) => (
                <div
                  key={particle.id}
                  className="particle absolute rounded-full animate-float"
                  style={{
                    width: `${particle.width}px`,
                    height: `${particle.height}px`,
                    top: `${particle.top}%`,
                    left: `${particle.left}%`,
                    animationDelay: `${particle.delay}s`,
                    backgroundColor: accentColor,
                    boxShadow: `0 0 10px ${accentColor}`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Corazones dorados animados - solo renderizados en el cliente */}
          {mounted && (
            <div className="hearts absolute inset-0 opacity-22">
              {hearts.map((heart) => (
                <div
                  key={heart.id}
                  className="heart absolute animate-heart-float"
                  style={{
                    width: `${heart.size}px`,
                    height: `${heart.size}px`,
                    top: `${heart.top}%`,
                    left: `${heart.left}%`,
                    animationDelay: `${heart.delay}s`,
                    animationDuration: `${heart.duration}s`,
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path
                      d="M50 15 Q30 5 15 25 Q5 45 15 65 Q30 85 50 100 Q70 85 85 65 Q95 45 85 25 Q70 5 50 15 Z"
                      fill={accentColor}
                      opacity="0.3"
                    />
                  </svg>
                </div>
              ))}
            </div>
          )}

          {/* Brillo central */}
          <div className="center-glow absolute inset-0 bg-gradient-to-br from-transparent via-amber-100/5 to-transparent animate-pulse-slow" />
        </div>
      )}

      {/* Contenido centrado con efectos premium */}
      <div className="content absolute inset-0 flex flex-col items-center justify-center text-center px-6 md:px-8 text-white">
        {/* Logo con efecto premium */}
        {logoSrc && (
          <div className="logo-container mb-6 w-52 h-52 md:w-60 md:h-60 relative animate-fade-in-up">
            <Image
              src={logoSrc}
              alt="Logo San Valentín Premium"
              fill
              style={{ objectFit: 'contain' }}
              className="drop-shadow-[0_0_30px_rgba(255,215,0,0.5)] animate-pulse-glow"
            />
          </div>
        )}

        {/* Título con efecto premium */}
        <h1 className="title text-3xl md:text-5xl lg:text-6xl font-serif font-black mb-4 tracking-wide drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)] leading-tight animate-fade-in-up">
          <span className="gradient-text bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-white to-amber-100 animate-gradient-shift">
            {title}
          </span>
        </h1>

        {/* Subtítulo con efecto premium */}
        {subtitle && (
          <p className="subtitle text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl font-light drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] text-amber-50/95 animate-fade-in-up delay-200">
            {subtitle}
          </p>
        )}

        {/* Botón CTA premium */}
        {ctaText && onCtaClick && (
          <button
            onClick={onCtaClick}
            className="cta-button group relative px-10 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:via-amber-700 hover:to-amber-800 text-white font-bold rounded-full transition-all duration-500 shadow-[0_10px_30px_-5px_rgba(217,119,6,0.6)] hover:shadow-[0_15px_40px_-5px_rgba(217,119,6,0.8)] text-base md:text-lg mt-4 overflow-hidden animate-fade-in-up delay-300"
          >
            <span className="button-content relative z-10 flex items-center gap-2">
              {ctaText}
              <svg
                className="button-icon w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </span>
            <div className="button-overlay absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
            <div className="button-shimmer absolute inset-0 animate-shimmer" />
          </button>
        )}

        {/* Efecto de borde brillante */}
        <div className="border-shine absolute inset-0 border-2 border-transparent rounded-3xl animate-border-shine" />

        {children}
      </div>

      {/* Efecto de profundidad inferior */}
      <div className="depth-effect absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />

      <style jsx>{`
        /* Animaciones premium */
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes heartFloat {
          0%, 100% {
            transform: translateY(0) rotate(0deg) scale(1);
          }
          25% {
            transform: translateY(-30px) rotate(-5deg) scale(1.1);
          }
          50% {
            transform: translateY(-15px) rotate(0deg) scale(1);
          }
          75% {
            transform: translateY(-25px) rotate(3deg) scale(0.9);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.8);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes pulseSlow {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.4;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes borderShine {
          0% {
            box-shadow: 0 0 15px rgba(255, 215, 0, 0);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
          }
          100% {
            box-shadow: 0 0 15px rgba(255, 215, 0, 0);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-heart-float {
          animation: heartFloat 15s ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulseGlow 3s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradientShift 4s ease infinite;
        }

        .animate-pulse-slow {
          animation: pulseSlow 4s ease-in-out infinite;
        }

        .animate-pulse-slow-reverse {
          animation: pulseSlow 4s ease-in-out infinite reverse;
        }

        .animate-shimmer {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          background-size: 1000px 100%;
        }

        .animate-border-shine {
          animation: borderShine 3s ease-in-out infinite;
        }

        .delay-200 {
          animation-delay: 0.2s;
        }

        .delay-300 {
          animation-delay: 0.3s;
        }

        /* Estilos adicionales para mejor visualización */
        .valentine-banner {
          position: relative;
        }

        .top-glow, .bottom-glow {
          position: absolute;
        }

        .bg-image, .gradient-bg {
          position: relative;
        }

        .overlay, .main-gradient, .particles, .hearts, .center-glow {
          position: absolute;
        }

        .content {
          position: absolute;
        }

        .logo-container {
          position: relative;
        }

        .title, .subtitle {
          position: relative;
        }

        .gradient-text {
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .cta-button {
          position: relative;
          cursor: pointer;
        }

        .button-content {
          position: relative;
        }

        .button-overlay, .button-shimmer {
          position: absolute;
        }

        .border-shine {
          pointer-events: none;
        }

        .depth-effect {
          position: absolute;
        }
      `}</style>
    </div>
  );
  
}