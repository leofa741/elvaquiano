'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';

interface PatriaBannerProps {
    title: string;
    subtitle?: string;
    ctaText?: string;  
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
    type: 'sol' | 'escarapela' | 'bandera' | 'paloma' | 'gorro';
}

interface Sparkle {
    id: number;
    size: number;
    top: number;
    left: number;
    delay: number;
}

export default function PatriaBanner({
    title,
    subtitle,
    ctaText,
    backgroundImage,
    logoSrc,
    children,
    gradientColors = {
        from: '#75AADB',    // Celeste argentino
        via: '#FFFFFF',      // Blanco
        to: '#F4D03F',       // Dorado Sol de Mayo
    },
    accentColor = '#75AADB',
    highlightColor = '#F4D03F',
}: PatriaBannerProps) {
    const [mounted, setMounted] = useState(false);
    const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);

    useEffect(() => {
        setMounted(true);

        // Tipos de elementos patrios argentinos
        const itemTypes: FloatingItem['type'][] = ['sol', 'escarapela', 'bandera', 'paloma', 'gorro'];

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

        // Generar brillos/destellos dorados
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

    // Iconos SVG para elementos patrios argentinos
    const PatriaIcon = ({ type, color }: { type: FloatingItem['type']; color: string }) => {
        switch (type) {
            case 'sol':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" className="w-full h-full">
                        <circle cx="12" cy="12" r="4" fill={color} stroke="none" />
                        {/* Rayos del Sol de Mayo */}
                        {[...Array(16)].map((_, i) => {
                            const angle = (i * 22.5 * Math.PI) / 180;
                            const x1 = 12 + 5 * Math.cos(angle);
                            const y1 = 12 + 5 * Math.sin(angle);
                            const x2 = 12 + 9 * Math.cos(angle);
                            const y2 = 12 + 9 * Math.sin(angle);
                            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1.5" strokeLinecap="round" />;
                        })}
                        {/* Carita del Sol */}
                        <circle cx="10" cy="11" r="0.8" fill="#1a365d" />
                        <circle cx="14" cy="11" r="0.8" fill="#1a365d" />
                        <path d="M10 14 Q12 15.5 14 14" stroke="#1a365d" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                    </svg>
                );
            case 'escarapela':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                        <circle cx="12" cy="12" r="10" fill="#75AADB" />
                        <circle cx="12" cy="12" r="7" fill="#FFFFFF" />
                        <circle cx="12" cy="12" r="4" fill="#75AADB" />
                        <circle cx="12" cy="12" r="1.5" fill="#F4D03F" />
                    </svg>
                );
            case 'bandera':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                        <rect x="2" y="4" width="18" height="16" rx="1" fill="#FFFFFF" stroke={color} strokeWidth="1" />
                        <rect x="2" y="7" width="18" height="3" fill="#75AADB" />
                        <rect x="2" y="14" width="18" height="3" fill="#75AADB" />
                        <circle cx="11" cy="12" r="2" fill="#F4D03F" />
                        <rect x="1" y="10" width="2" height="4" fill="#8B7500" rx="0.5" />
                    </svg>
                );
            case 'paloma':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-full h-full">
                        <path d="M12 12c-2-3-5-4-7-3 1-2 3-3 5-3 1-2 3-3 5-2-1 2-1 4 0 6-2 1-4 1-6 2z" fill={color} opacity="0.3" />
                        <path d="M12 12c2 1 4 1 6 2-1 2-3 3-5 3-1 2-3 3-5 2 2-1 4-3 4-7z" fill={color} opacity="0.6" />
                        <circle cx="14" cy="10" r="1" fill="#1a365d" />
                        <path d="M8 14 Q6 16 4 15" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
                    </svg>
                );
            case 'gorro':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-full h-full">
                        <path d="M12 3 L18 8 L12 10 L6 8 Z" fill={color} opacity="0.8" />
                        <ellipse cx="12" cy="14" rx="6" ry="3" fill={color} opacity="0.4" />
                        <path d="M12 10 L12 14" stroke={color} strokeWidth="1" />
                        <circle cx="12" cy="7" r="1.5" fill="#F4D03F" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="patria-banner relative w-full mx-auto overflow-hidden shadow-[0_25px_80px_-20px_rgba(117,170,219,0.6)] border border-white/40 bg-clip-padding backdrop-filter backdrop-blur-sm">
            {/* Efecto de brillo superior celeste */}
            <div className="top-glow absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#75AADB] to-transparent opacity-40 animate-pulse-slow" />

            {/* Efecto de brillo inferior dorado */}
            <div className="bottom-glow absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F4D03F] to-transparent opacity-40 animate-pulse-slow-reverse" />

            {/* Fondo con efectos premium */}
            {backgroundImage ? (
                <div className="bg-image relative h-80 md:h-96 w-full" aria-hidden="true">
                    <Image
                        src={backgroundImage}
                        alt="Fondo 25 de Mayo Premium"
                        fill
                        style={{ objectFit: 'cover' }}
                        className="brightness-90 contrast-105 saturate-110"
                        priority
                    />
                    <div className="overlay absolute inset-0 bg-gradient-to-br from-[#1a365d]/60 via-[#75AADB]/20 to-[#F4D03F]/30" />
                </div>
            ) : (
                <div
                    className="gradient-bg h-80 md:h-96 relative overflow-hidden"
                    aria-hidden="true"
                >
                    {/* Gradiente principal patrio */}
                    <div
                        className="main-gradient absolute inset-0 bg-gradient-to-br transition-all duration-700"
                        style={{
                            background: `linear-gradient(135deg, ${gradientColors.from} 0%, ${gradientColors.via} 50%, ${gradientColors.to} 100%)`,
                        }}
                    />

                    {/* Patrón de rayas sutiles (bandera) */}
                    <div
                        className="flag-pattern absolute inset-0 opacity-15"
                        style={{
                            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(117,170,219,0.15) 20px, rgba(117,170,219,0.15) 40px)`,
                        }}
                    />

                    {/* Elementos flotantes patrios - solo renderizados en el cliente */}
                    {mounted && (
                        <div className="floating-items absolute inset-0">
                            {floatingItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="floating-item absolute animate-float-slow opacity-80"
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
                                    <PatriaIcon type={item.type} color={item.type === 'sol' ? highlightColor : accentColor} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Destellos dorados - solo renderizados en el cliente */}
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
                                        boxShadow: `0 0 ${sparkle.size * 3}px ${highlightColor}`,
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Brillo central radial patrio */}
                    <div className="center-glow absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent animate-pulse-slow" />

                    {/* Círculos decorativos con colores patrios */}
                    <div className="decorative-circle absolute -top-10 -right-10 w-40 h-40 border-2 border-[#F4D03F]/40 rounded-full animate-spin-slow" />
                    <div className="decorative-circle absolute -bottom-8 -left-8 w-32 h-32 border-2 border-[#75AADB]/40 rounded-full animate-spin-slow-reverse" />
                </div>
            )}

            {/* Contenido centrado con efectos premium */}
            <div className="content absolute inset-0 flex flex-col items-center justify-center text-center px-6 md:px-8 text-white z-10">
                {/* Badge patrio */}
                <div className="promo-badge mb-4 px-5 py-2 bg-gradient-to-r from-[#75AADB] via-white to-[#75AADB] rounded-full text-xs md:text-sm font-bold text-[#1a365d] shadow-lg animate-fade-in-down border border-white/50">
                    🇦🇷 25 de Mayo - Fiesta Patria
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
                            alt="Logo 25 de Mayo"
                            fill
                            sizes="(max-width: 768px) 180px, 280px"
                            style={{
                                objectFit: 'contain',
                                width: '100%',
                                height: '100%',
                                transform: 'translateY(35px)',
                            }}
                            className="drop-shadow-[0_0_25px_rgba(244,208,63,0.7)] animate-pulse-glow"
                        />
                    </div>
                )}

                {/* Título con efecto premium */}
                <h1 className="title text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight drop-shadow-[0_4px_20px_rgba(26,54,93,0.8)] leading-tight animate-fade-in-up">
                    <span className="gradient-text bg-clip-text text-transparent bg-gradient-to-r from-[#1a365d] via-white to-[#F4D03F] animate-gradient-shift">
                        {title}
                    </span>
                </h1>

                {/* Subtítulo con efecto premium */}
                {subtitle && (
                    <p className="subtitle text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl font-medium drop-shadow-[0_2px_12px_rgba(26,54,93,0.6)] text-[#1a365d]/95 animate-fade-in-up delay-200">
                        {subtitle}
                    </p>
                )}

                {/* Botón CTA premium 
                {ctaText && ctaLink && (
                    <button
                        onClick={() => window.location.href = ctaLink}
                        className="cta-button group relative px-10 py-4 bg-gradient-to-r from-[#F4D03F] via-[#E5BE01] to-[#B89E01] hover:from-[#E5BE01] hover:via-[#D4AF37] hover:to-[#A38B00] text-[#1a365d] font-bold rounded-full transition-all duration-500 shadow-[0_12px_35px_-5px_rgba(244,208,63,0.8)] hover:shadow-[0_18px_45px_-5px_rgba(244,208,63,1)] text-base md:text-lg mt-4 overflow-hidden animate-fade-in-up delay-300 hover:scale-105"
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
                        <div className="button-overlay absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
                        <div className="button-shimmer absolute inset-0 animate-shimmer" />
                    </button>
                )}*/}

                {/* Tags de categorías patrias */}
                <div className="category-tags flex flex-wrap justify-center gap-2 mt-6 animate-fade-in-up delay-500">
                    {['🎖️ Historia', '🎪 Eventos', '🍽️ Tradición', '🎵 Folklore'].map((tag, index) => (
                        <span
                            key={tag}
                            className="tag px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs md:text-sm border border-white/30 hover:bg-white/30 transition-all cursor-default hover:scale-105"
                            style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Efecto de borde brillante patrio */}
                <div className="border-shine absolute inset-0 border-2 border-transparent rounded-3xl animate-border-shine pointer-events-none" />
            </div>

            {children}

            {/* Efecto de profundidad inferior */}
            <div className="depth-effect absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#1a365d]/95 via-[#1a365d]/50 to-transparent" />

            {/* Decoración inferior con elementos patrios */}
            <div className="bottom-decoration absolute bottom-4 left-0 right-0 flex justify-center gap-5 opacity-60">
                <div className="w-9 h-9 animate-bounce-slow" style={{ animationDelay: '0s' }}>
                    <PatriaIcon type="sol" color={highlightColor} />
                </div>
                <div className="w-9 h-9 animate-bounce-slow" style={{ animationDelay: '0.4s' }}>
                    <PatriaIcon type="escarapela" color={accentColor} />
                </div>
                <div className="w-9 h-9 animate-bounce-slow" style={{ animationDelay: '0.8s' }}>
                    <PatriaIcon type="bandera" color={accentColor} />
                </div>
                <div className="w-9 h-9 animate-bounce-slow" style={{ animationDelay: '1.2s' }}>
                    <PatriaIcon type="paloma" color={accentColor} />
                </div>
                <div className="w-9 h-9 animate-bounce-slow" style={{ animationDelay: '1.6s' }}>
                    <PatriaIcon type="gorro" color={highlightColor} />
                </div>
            </div>

            <style jsx>{`
        /* Animaciones premium patrias */
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
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.4);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(244, 208, 63, 0.6);
          }
          50% {
            box-shadow: 0 0 45px rgba(244, 208, 63, 0.9);
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
            opacity: 0.4;
          }
          50% {
            opacity: 0.6;
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
            box-shadow: 0 0 15px rgba(244, 208, 63, 0);
          }
          50% {
            box-shadow: 0 0 40px rgba(117, 170, 219, 0.8);
          }
          100% {
            box-shadow: 0 0 15px rgba(244, 208, 63, 0);
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
            transform: translateY(-12px);
          }
        }

        .animate-float-slow {
          animation: floatSlow 18s ease-in-out infinite;
        }

        .animate-twinkle {
          animation: twinkle 3.5s ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulseGlow 4s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.9s ease-out forwards;
        }

        .animate-fade-in-down {
          animation: fadeInDown 0.7s ease-out forwards;
        }

        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradientShift 6s ease infinite;
        }

        .animate-pulse-slow {
          animation: pulseSlow 5.5s ease-in-out infinite;
        }

        .animate-pulse-slow-reverse {
          animation: pulseSlow 5.5s ease-in-out infinite reverse;
        }

        .animate-shimmer {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          background-size: 1000px 100%;
        }

        .animate-border-shine {
          animation: borderShine 4s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spinSlow 28s linear infinite;
        }

        .animate-spin-slow-reverse {
          animation: spinSlow 32s linear infinite reverse;
        }

        .animate-bounce-slow {
          animation: bounceSlow 2.8s ease-in-out infinite;
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
        .patria-banner {
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

        .overlay, .main-gradient, .flag-pattern, .floating-items, .sparkles, .center-glow, .decorative-circle {
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
          box-shadow: 0 6px 20px rgba(26, 54, 93, 0.3);
        }

        .bottom-decoration {
          position: absolute;
          z-index: 8;
        }

        .floating-item {
          will-change: transform;
          filter: drop-shadow(0 3px 6px rgba(26, 54, 93, 0.25));
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
            padding: 0.4rem 0.8rem;
          }
          .bottom-decoration {
            gap: 3px;
          }
          .bottom-decoration > div {
            width: 28px !important;
            height: 28px !important;
          }
        }
      `}</style>
        </div>
    );
}