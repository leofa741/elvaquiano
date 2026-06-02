'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';

interface MundialBannerProps {
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
    type: 'trofeo' | 'pelota' | 'escarapela' | 'estrella' | 'bandera';
}

interface Sparkle {
    id: number;
    size: number;
    top: number;
    left: number;
    delay: number;
}

export default function Mundial2026Banner({
    title,
    subtitle,
    ctaText,
    backgroundImage,
    logoSrc,
    children,
    gradientColors = {
        from: '#0A192F',    // Azul noche sobrio y premium
        via: '#13507A',      // Azul Argentina profundo
        to: '#0A192F',       // Azul noche (efecto viñeta premium)
    },
    accentColor = '#75AADB', // Celeste albiceleste
    highlightColor = '#F4D03F', // Dorado campeón
}: MundialBannerProps) {
    const [mounted, setMounted] = useState(false);
    const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);

    useEffect(() => {
        setMounted(true);

        // Tipos de elementos mundialistas argentinos
        const itemTypes: FloatingItem['type'][] = ['trofeo', 'pelota', 'escarapela', 'estrella', 'bandera'];

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

        // Generar brillos/destellos dorados (polvo de campeón)
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

    // Iconos SVG para elementos mundialistas argentinos
    const MundialIcon = ({ type, color }: { type: FloatingItem['type']; color: string }) => {
        switch (type) {
            case 'trofeo':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-lg">
                        <path d="M7 4h10c0 4-1 8-5 10-4-2-5-6-5-10z" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
                        <path d="M7 4c-2 0-4 1-4 4 0 3 2 5 4 5" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M17 4c2 0 4 1 4 4 0 3-2 5-4 5" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M10 14v4h4v-4" fill={color} opacity="0.5" stroke={color} strokeWidth="1.5" />
                        <path d="M8 18h8v2H8z" fill={color} stroke={color} strokeWidth="1.5" />
                    </svg>
                );
            case 'pelota':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-lg">
                        <circle cx="12" cy="12" r="9" fill="#FFFFFF" stroke={color} strokeWidth="1.5" />
                        <path d="M12 3L15 8H20L16 12L18 18L12 15L6 18L8 12L4 8H9L12 3Z" fill={color} opacity="0.25" stroke={color} strokeWidth="1" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="2.5" fill={color} />
                    </svg>
                );
            case 'escarapela':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-lg">
                        <circle cx="12" cy="12" r="10" fill="#75AADB" />
                        <circle cx="12" cy="12" r="7" fill="#FFFFFF" />
                        <circle cx="12" cy="12" r="4" fill="#75AADB" />
                        <circle cx="12" cy="12" r="1.5" fill={color} />
                    </svg>
                );
            case 'estrella':
                return (
                    <svg viewBox="0 0 24 24" fill={color} className="w-full h-full drop-shadow-[0_0_8px_rgba(244,208,63,0.6)]">
                        <path d="M12 2l2.5 6.5L21 9l-5 4.5 1.5 6.5L12 17l-5.5 3 1.5-6.5L3 9l6.5-.5L12 2z" />
                    </svg>
                );
            case 'bandera':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-lg">
                        <rect x="2" y="4" width="18" height="16" rx="1" fill="#FFFFFF" stroke={color} strokeWidth="1" />
                        <rect x="2" y="7" width="18" height="3" fill="#75AADB" />
                        <rect x="2" y="14" width="18" height="3" fill="#75AADB" />
                        <circle cx="11" cy="12" r="2" fill={color} />
                        <rect x="1" y="10" width="2" height="4" fill="#8B7500" rx="0.5" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="mundial-banner relative w-full mx-auto overflow-hidden shadow-[0_25px_80px_-20px_rgba(10,25,47,0.7)] border border-white/10 bg-clip-padding backdrop-filter backdrop-blur-sm">
            {/* Efecto de brillo superior celeste */}
            <div className="top-glow absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#75AADB] to-transparent opacity-60 animate-pulse-slow" />

            {/* Efecto de brillo inferior dorado */}
            <div className="bottom-glow absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F4D03F] to-transparent opacity-60 animate-pulse-slow-reverse" />

            {/* Fondo con efectos premium */}
            {backgroundImage ? (
                <div className="bg-image relative h-80 md:h-96 w-full" aria-hidden="true">
                    <Image
                        src={backgroundImage}
                        alt="Fondo Mundial 2026 Premium"
                        fill
                        style={{ objectFit: 'cover' }}
                        className="brightness-75 contrast-110 saturate-90"
                        priority
                    />
                    <div className="overlay absolute inset-0 bg-gradient-to-br from-[#0A192F]/80 via-[#13507A]/40 to-[#0A192F]/80" />
                </div>
            ) : (
                <div
                    className="gradient-bg h-80 md:h-96 relative overflow-hidden"
                    aria-hidden="true"
                >
                    {/* Gradiente principal sobrio y premium */}
                    <div
                        className="main-gradient absolute inset-0 transition-all duration-700"
                        style={{
                            background: `radial-gradient(circle at 50% 30%, ${gradientColors.via} 0%, ${gradientColors.from} 60%, ${gradientColors.to} 100%)`,
                        }}
                    />

                    {/* Patrón de rayas verticales sutiles (Camiseta Albiceleste) */}
                    <div
                        className="jersey-pattern absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(117,170,219,0.3) 30px, rgba(117,170,219,0.3) 60px)`,
                        }}
                    />

                    {/* Elementos flotantes mundialistas - solo renderizados en el cliente */}
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
                                    <MundialIcon type={item.type} color={item.type === 'estrella' || item.type === 'trofeo' ? highlightColor : accentColor} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Destellos dorados (polvo de campeón) - solo renderizados en el cliente */}
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

                    {/* Brillo central radial */}
                    <div className="center-glow absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent animate-pulse-slow" />

                    {/* Círculos decorativos con colores patrios */}
                    <div className="decorative-circle absolute -top-10 -right-10 w-40 h-40 border border-[#F4D03F]/20 rounded-full animate-spin-slow" />
                    <div className="decorative-circle absolute -bottom-8 -left-8 w-32 h-32 border border-[#75AADB]/20 rounded-full animate-spin-slow-reverse" />
                </div>
            )}

            {/* Contenido centrado con efectos premium */}
            <div className="content absolute inset-0 flex flex-col items-center justify-center text-center px-6 md:px-8 z-10">
                {/* Badge mundialista */}
                <div className="promo-badge mb-4 px-5 py-2 bg-gradient-to-r from-[#F4D03F] via-[#FFFFFF] to-[#75AADB] rounded-full text-xs md:text-sm font-extrabold text-[#0A192F] shadow-[0_0_20px_rgba(244,208,63,0.3)] animate-fade-in-down border border-white/60 tracking-wide">
                    🏆 Mundial 2026 - Vamos Argentina
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
                            alt="Logo Mundial 2026"
                            fill
                            sizes="(max-width: 768px) 180px, 280px"
                            style={{
                                objectFit: 'contain',
                                width: '100%',
                                height: '100%',
                                transform: 'translateY(35px)',
                            }}
                            className="drop-shadow-[0_0_30px_rgba(244,208,63,0.5)] animate-pulse-glow"
                        />
                    </div>
                )}

                {/* Título con efecto premium campeón */}
                <h1 className="title text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] leading-tight animate-fade-in-up">
                    <span className="gradient-text bg-clip-text text-transparent bg-gradient-to-r from-[#F4D03F] via-[#FFFFFF] to-[#75AADB] animate-gradient-shift">
                        {title}
                    </span>
                </h1>

                {/* Subtítulo con efecto premium */}
                {subtitle && (
                    <p className="subtitle text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl font-medium drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)] text-[#E2E8F0]/90 animate-fade-in-up delay-200">
                        {subtitle}
                    </p>
                )}

                {/* Tags de categorías mundialistas */}
                <div className="category-tags flex flex-wrap justify-center gap-2 mt-6 animate-fade-in-up delay-500">
                    {['⚽ Fútbol', '🏆 Gloria', '🇦🇷 Pasión', '🎉 Fiesta'].map((tag, index) => (
                        <span
                            key={tag}
                            className="tag px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs md:text-sm font-medium text-[#E2E8F0] border border-white/20 hover:bg-white/20 hover:border-[#75AADB]/50 transition-all duration-300 cursor-default hover:scale-105 hover:shadow-[0_0_15px_rgba(117,170,219,0.3)]"
                            style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Efecto de borde brillante dinámico */}
                <div className="border-shine absolute inset-0 border border-white/10 rounded-3xl animate-border-shine pointer-events-none" />
            </div>

            {children}

            {/* Efecto de profundidad inferior */}
            <div className="depth-effect absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A192F] via-[#0A192F]/60 to-transparent" />

            {/* Decoración inferior con elementos mundialistas */}
            <div className="bottom-decoration absolute bottom-4 left-0 right-0 flex justify-center gap-5 opacity-70">
                <div className="w-9 h-9 animate-bounce-slow" style={{ animationDelay: '0s' }}>
                    <MundialIcon type="trofeo" color={highlightColor} />
                </div>
                <div className="w-9 h-9 animate-bounce-slow" style={{ animationDelay: '0.4s' }}>
                    <MundialIcon type="pelota" color={accentColor} />
                </div>
                <div className="w-9 h-9 animate-bounce-slow" style={{ animationDelay: '0.8s' }}>
                    <MundialIcon type="escarapela" color={accentColor} />
                </div>
                <div className="w-9 h-9 animate-bounce-slow" style={{ animationDelay: '1.2s' }}>
                    <MundialIcon type="estrella" color={highlightColor} />
                </div>
                <div className="w-9 h-9 animate-bounce-slow" style={{ animationDelay: '1.6s' }}>
                    <MundialIcon type="bandera" color={accentColor} />
                </div>
            </div>

            <style jsx>{`
                /* Animaciones premium mundialistas */
                @keyframes floatSlow {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    25% { transform: translateY(-15px) rotate(3deg); }
                    50% { transform: translateY(-8px) rotate(-2deg); }
                    75% { transform: translateY(-12px) rotate(2deg); }
                }

                @keyframes twinkle {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.5); }
                }

                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 20px rgba(244, 208, 63, 0.4); }
                    50% { box-shadow: 0 0 40px rgba(244, 208, 63, 0.7); }
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                @keyframes pulseSlow {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.7; }
                }

                @keyframes borderShine {
                    0% { box-shadow: inset 0 0 20px rgba(244, 208, 63, 0); }
                    50% { box-shadow: inset 0 0 30px rgba(117, 170, 219, 0.2); }
                    100% { box-shadow: inset 0 0 20px rgba(244, 208, 63, 0); }
                }

                @keyframes spinSlow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes bounceSlow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                .animate-float-slow { animation: floatSlow 18s ease-in-out infinite; }
                .animate-twinkle { animation: twinkle 3.5s ease-in-out infinite; }
                .animate-pulse-glow { animation: pulseGlow 4s ease-in-out infinite; }
                .animate-fade-in-up { animation: fadeInUp 0.9s ease-out forwards; }
                .animate-fade-in-down { animation: fadeInDown 0.7s ease-out forwards; }
                .animate-gradient-shift { 
                    background-size: 200% 200%; 
                    animation: gradientShift 6s ease infinite; 
                }
                .animate-pulse-slow { animation: pulseSlow 5.5s ease-in-out infinite; }
                .animate-pulse-slow-reverse { animation: pulseSlow 5.5s ease-in-out infinite reverse; }
                .animate-border-shine { animation: borderShine 4s ease-in-out infinite; }
                .animate-spin-slow { animation: spinSlow 28s linear infinite; }
                .animate-spin-slow-reverse { animation: spinSlow 32s linear infinite reverse; }
                .animate-bounce-slow { animation: bounceSlow 2.8s ease-in-out infinite; }

                .delay-200 { animation-delay: 0.2s !important; }
                .delay-500 { animation-delay: 0.5s !important; }

                /* Estructura y jerarquía visual */
                .mundial-banner { position: relative; border-radius: 1.5rem; }
                .top-glow, .bottom-glow { position: absolute; z-index: 5; }
                .bg-image, .gradient-bg { position: relative; }
                .overlay, .main-gradient, .jersey-pattern, .floating-items, .sparkles, .center-glow, .decorative-circle { position: absolute; }
                .content { position: absolute; z-index: 20; }
                .promo-badge { position: relative; z-index: 25; }
                .logo-container { position: relative; z-index: 22; }
                .title, .subtitle { position: relative; z-index: 21; }
                .gradient-text { -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                .border-shine { pointer-events: none; z-index: 15; }
                .depth-effect { position: absolute; z-index: 10; }
                .category-tags { position: relative; z-index: 21; }
                .tag { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .bottom-decoration { position: absolute; z-index: 8; }
                .floating-item { will-change: transform; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)); }
                .sparkle { will-change: opacity, transform; }

                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .title { font-size: 2rem; }
                    .subtitle { font-size: 1.1rem; }
                    .promo-badge { font-size: 0.75rem; padding: 0.4rem 0.8rem; }
                    .bottom-decoration { gap: 3px; }
                    .bottom-decoration > div { width: 28px !important; height: 28px !important; }
                }
            `}</style>
        </div>
    );
}