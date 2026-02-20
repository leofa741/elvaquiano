'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';

interface BackToSchoolBannerProps {
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
    highlightColor?: string;
}

interface FloatingItem {
    id: number;
    size: number;
    top: number;
    left: number;
    delay: number;
    duration: number;
    rotation: number;
    type: 'pencil' | 'book' | 'apple' | 'star' | 'ruler';
}

interface Sparkle {
    id: number;
    size: number;
    top: number;
    left: number;
    delay: number;
}

export default function BackToSchoolBanner({
    title,
    subtitle,
    ctaText,
    onCtaClick,
    backgroundImage,
    logoSrc,
    children,
    gradientColors = {
        from: '#1e40af',
        via: '#3b82f6',
        to: '#0ea5e9',
    },
    accentColor = '#1e40af',
    highlightColor = '#10b981',
}: BackToSchoolBannerProps) {
    const [mounted, setMounted] = useState(false);
    const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);

    useEffect(() => {
        setMounted(true);

        // Tipos de elementos escolares
        const itemTypes: FloatingItem['type'][] = ['pencil', 'book', 'apple', 'star', 'ruler'];

        // Generar elementos flotantes solo en el cliente
        const generatedItems: FloatingItem[] = [];
        for (let i = 0; i < 12; i++) {
            generatedItems.push({
                id: i,
                size: Math.random() * 40 + 20,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 8,
                duration: Math.random() * 12 + 15,
                rotation: Math.random() * 360,
                type: itemTypes[Math.floor(Math.random() * itemTypes.length)],
            });
        }
        setFloatingItems(generatedItems);

        // Generar brillos/destellos
        const generatedSparkles: Sparkle[] = [];
        for (let i = 0; i < 20; i++) {
            generatedSparkles.push({
                id: i,
                size: Math.random() * 4 + 1,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 4,
            });
        }
        setSparkles(generatedSparkles);
    }, []);

    // Iconos SVG para elementos escolares
    const SchoolIcon = ({ type, color }: { type: FloatingItem['type']; color: string }) => {
        switch (type) {
            case 'pencil':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-full h-full">
                        <path d="M16.862 3.487a2.5 2.5 0 013.651 3.651L10.5 17.15l-4.375.938.937-4.376L16.862 3.487z" />
                        <path d="M19.5 6.5l-3 3M4 20h4l1-1-4-4-1 4z" />
                    </svg>
                );
            case 'book':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-full h-full">
                        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                        <path d="M8 7h8M8 11h6" />
                    </svg>
                );
            case 'apple':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-full h-full">
                        <path d="M12 20c4 0 7-3 7-7 0-2-1-4-3-5-1 2-3 3-4 3s-3-1-4-3c-2 1-3 3-3 5 0 4 3 7 7 7z" />
                        <path d="M12 8V4M9 4c1 2 4 2 6 0" />
                        <path d="M14 2c1 1 1 2 0 3" />
                    </svg>
                );
            case 'star':
                return (
                    <svg viewBox="0 0 24 24" fill={color} stroke="none" className="w-full h-full">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                );
            case 'ruler':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-full h-full">
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <path d="M6 10v2M10 10v2M14 10v2M18 10v2" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="school-banner relative w-full mx-auto overflow-hidden shadow-[0_25px_80px_-20px_rgba(30,64,175,0.7)] border border-blue-400/30 bg-clip-padding backdrop-filter backdrop-blur-sm">
            {/* Efecto de brillo superior */}
            <div className="top-glow absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-300 to-transparent opacity-30 animate-pulse-slow" />

            {/* Efecto de brillo inferior */}
            <div className="bottom-glow absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent opacity-30 animate-pulse-slow-reverse" />

            {/* Fondo con efectos premium */}
            {backgroundImage ? (
                <div className="bg-image relative h-80 md:h-96 w-full" aria-hidden="true">
                    <Image
                        src={backgroundImage}
                        alt="Fondo Vuelta al Cole Premium"
                        fill
                        style={{ objectFit: 'cover' }}
                        className="brightness-75 contrast-110 saturate-125"
                        priority
                    />
                    <div className="overlay absolute inset-0 bg-gradient-to-br from-blue-900/50 via-blue-800/30 to-emerald-900/50" />
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

                    {/* Patrón de cuadrícula sutil */}
                    <div
                        className="grid-pattern absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                            backgroundSize: '30px 30px'
                        }}
                    />

                    {/* Elementos flotantes escolares - solo renderizados en el cliente */}
                    {mounted && (
                        <div className="floating-items absolute inset-0">
                            {floatingItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="floating-item absolute animate-float-slow opacity-70"
                                    style={{
                                        width: `${item.size}px`,
                                        height: `${item.size}px`,
                                        top: `${item.top}%`,
                                        left: `${item.left}%`,
                                        animationDelay: `${item.delay}s`,
                                        animationDuration: `${item.duration}s`,
                                        transform: `rotate(${item.rotation}deg)`,
                                    }}
                                >
                                    <SchoolIcon type={item.type} color={accentColor} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Destellos/brillos - solo renderizados en el cliente */}
                    {mounted && (
                        <div className="sparkles absolute inset-0">
                            {sparkles.map((sparkle) => (
                                <div
                                    key={sparkle.id}
                                    className="sparkle absolute rounded-full animate-twinkle"
                                    style={{
                                        width: `${sparkle.size}px`,
                                        height: `${sparkle.size}px`,
                                        top: `${sparkle.top}%`,
                                        left: `${sparkle.left}%`,
                                        animationDelay: `${sparkle.delay}s`,
                                        backgroundColor: highlightColor,
                                        boxShadow: `0 0 ${sparkle.size * 2}px ${highlightColor}`,
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Brillo central radial */}
                    <div className="center-glow absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent animate-pulse-slow" />

                    {/* Círculos decorativos */}
                    <div className="decorative-circle absolute -top-10 -right-10 w-40 h-40 border-2 border-yellow-400/30 rounded-full animate-spin-slow" />
                    <div className="decorative-circle absolute -bottom-8 -left-8 w-32 h-32 border-2 border-emerald-400/30 rounded-full animate-spin-slow-reverse" />
                </div>
            )}

            {/* Contenido centrado con efectos premium */}
            <div className="content absolute inset-0 flex flex-col items-center justify-center text-center px-6 md:px-8 text-white z-10">
                {/* Badge promocional */}
                <div className="promo-badge mb-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-amber-600 rounded-full text-xs md:text-sm font-bold text-blue-900 shadow-lg animate-fade-in-down">
                    ✏️ ¡Vuelta al Cole! Precios Especiales
                </div>

              
                {/* Logo con efecto premium */}
                {logoSrc && (
                    <div
                        className="logo-container mb-8 flex-shrink-0 relative animate-fade-in-up"
                        style={{
                            width: '180px',
                            height: '180px',
                        
                        }}
                    >
                        <Image
                            src={logoSrc}
                            alt="Logo Vuelta al Cole"
                            fill
                            sizes="(max-width: 768px) 180px, 280px"
                            style={{
                                objectFit: 'contain',
                                width: '100%',
                                height: '100%',
                                transform: 'translateY(35px)',
                              
                            }}
                            className="drop-shadow-[0_0_25px_rgba(25,191,36,0.6)] animate-pulse-glow"
                        />
                    </div>
                )}

                {/* Título con efecto premium */}
                <h1 className="title text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)] leading-tight animate-fade-in-up">
                    <span className="gradient-text bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-emerald-200 animate-gradient-shift">
                        {title}
                    </span>
                </h1>

                {/* Subtítulo con efecto premium */}
                {subtitle && (
                    <p className="subtitle text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl font-medium drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] text-blue-50/95 animate-fade-in-up delay-200">
                        {subtitle}
                    </p>
                )}

                {/* Botón CTA premium */}
                {ctaText && onCtaClick && (
                    <button
                        onClick={onCtaClick}
                        className="cta-button group relative px-10 py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-600 hover:via-amber-600 hover:to-orange-600 text-blue-900 font-bold rounded-full transition-all duration-500 shadow-[0_12px_35px_-5px_rgba(245,158,11,0.7)] hover:shadow-[0_18px_45px_-5px_rgba(245,158,11,0.9)] text-base md:text-lg mt-4 overflow-hidden animate-fade-in-up delay-300 hover:scale-105"
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
                        <div className="button-overlay absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                        <div className="button-shimmer absolute inset-0 animate-shimmer" />
                    </button>
                )}

                {/* Tags de categorías destacadas */}
                <div className="category-tags flex flex-wrap justify-center gap-2 mt-6 animate-fade-in-up delay-500">
                    {['📚 Útiles', '🎒 Mochilas', '✏️ Escritura', '🎨 Arte'].map((tag, index) => (
                        <span
                            key={tag}
                            className="tag px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs md:text-sm border border-white/20 hover:bg-white/20 transition-colors cursor-default"
                            style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Efecto de borde brillante */}
                <div className="border-shine absolute inset-0 border-2 border-transparent rounded-3xl animate-border-shine pointer-events-none" />
            </div>

            {children}

            {/* Efecto de profundidad inferior */}
            <div className="depth-effect absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-blue-950/90 via-blue-900/40 to-transparent" />

            {/* Decoración inferior con elementos escolares */}
            <div className="bottom-decoration absolute bottom-4 left-0 right-0 flex justify-center gap-4 opacity-40">
                <div className="w-8 h-8 animate-bounce-slow" style={{ animationDelay: '0s' }}>
                    <SchoolIcon type="pencil" color={accentColor} />
                </div>
                <div className="w-8 h-8 animate-bounce-slow" style={{ animationDelay: '0.5s' }}>
                    <SchoolIcon type="book" color={highlightColor} />
                </div>
                <div className="w-8 h-8 animate-bounce-slow" style={{ animationDelay: '1s' }}>
                    <SchoolIcon type="apple" color={accentColor} />
                </div>
                <div className="w-8 h-8 animate-bounce-slow" style={{ animationDelay: '1.5s' }}>
                    <SchoolIcon type="star" color={highlightColor} />
                </div>
            </div>

            <style jsx>{`
        /* Animaciones premium */
        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-15px) rotate(2deg);
          }
          50% {
            transform: translateY(-8px) rotate(-1deg);
          }
          75% {
            transform: translateY(-12px) rotate(1deg);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(25, 191, 36, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(25, 191, 36, 0.8);
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

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
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
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
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
            box-shadow: 0 0 15px rgba(251, 191, 36, 0);
          }
          50% {
            box-shadow: 0 0 35px rgba(25, 191, 36, 0.7);
          }
          100% {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0);
          }
        }

        @keyframes spinSlow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounceSlow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float-slow {
          animation: floatSlow 18s ease-in-out infinite;
        }

        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulseGlow 3.5s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.9s ease-out forwards;
        }

        .animate-fade-in-down {
          animation: fadeInDown 0.7s ease-out forwards;
        }

        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradientShift 5s ease infinite;
        }

        .animate-pulse-slow {
          animation: pulseSlow 5s ease-in-out infinite;
        }

        .animate-pulse-slow-reverse {
          animation: pulseSlow 5s ease-in-out infinite reverse;
        }

        .animate-shimmer {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          background-size: 1000px 100%;
        }

        .animate-border-shine {
          animation: borderShine 3.5s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spinSlow 25s linear infinite;
        }

        .animate-spin-slow-reverse {
          animation: spinSlow 30s linear infinite reverse;
        }

        .animate-bounce-slow {
          animation: bounceSlow 2.5s ease-in-out infinite;
        }

        .delay-200 {
          animation-delay: 0.2s !important;
        }

        .delay-300 {
          animation-delay: 0.3s !important;
        }

        .delay-500 {
          animation-delay: 0.5s !important;
        }

        /* Estilos adicionales para mejor visualización */
        .school-banner {
          position: relative;
          border-radius: 1.5rem;
        }

        .top-glow, .bottom-glow {
          position: absolute;
          z-index: 5;
        }

        .bg-image, .gradient-bg {
          position: relative;
        }

        .overlay, .main-gradient, .grid-pattern, .floating-items, .sparkles, .center-glow, .decorative-circle {
          position: absolute;
        }

        .content {
          position: absolute;
          z-index: 20;
        }

        .promo-badge {
          position: relative;
          z-index: 25;
        }

        .logo-container {
          position: relative;
          z-index: 22;
        }

        .title, .subtitle {
          position: relative;
          z-index: 21;
        }

        .gradient-text {
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .cta-button {
          position: relative;
          cursor: pointer;
          z-index: 25;
          transform-origin: center;
        }

        .button-content {
          position: relative;
        }

        .button-overlay, .button-shimmer {
          position: absolute;
        }

        .border-shine {
          pointer-events: none;
          z-index: 15;
        }

        .depth-effect {
          position: absolute;
          z-index: 10;
        }

        .category-tags {
          position: relative;
          z-index: 21;
        }

        .tag {
          transition: all 0.3s ease;
        }

        .tag:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .bottom-decoration {
          position: absolute;
          z-index: 8;
        }

        .floating-item {
          will-change: transform;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }

        .sparkle {
          will-change: opacity, transform;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .title {
            font-size: 2rem;
          }
          .subtitle {
            font-size: 1.1rem;
          }
          .promo-badge {
            font-size: 0.75rem;
            padding: 0.35rem 0.75rem;
          }
        }
      `}</style>
        </div>
    );
}