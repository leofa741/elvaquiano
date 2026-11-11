'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';

interface NavidadBannerProps {
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
    goldColor?: string;
}

interface FloatingItem {
    id: number;
    size: number;
    top: number;
    left: number;
    delay: number;
    duration: number;
    rotation: number;
    type: 'copo' | 'estrella' | 'arbol' | 'regalo' | 'campana' | 'baston';
}

interface Sparkle {
    id: number;
    size: number;
    top: number;
    left: number;
    delay: number;
}

export default function NavidadBanner({
    title,
    subtitle,
    ctaText,
    backgroundImage,
    logoSrc,
    children,
    gradientColors = {
        from: '#7A0A1F',    // Rojo vino profundo
        via: '#FFF8E7',     // Crema navideño
        to: '#1B4332',      // Verde pino
    },
    accentColor = '#2D5016',   // Verde bosque
    highlightColor = '#D42426', // Rojo navideño
    goldColor = '#FFD700',      // Dorado premium
}: NavidadBannerProps) {
    const [mounted, setMounted] = useState(false);
    const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);

    useEffect(() => {
        setMounted(true);

        const itemTypes: FloatingItem['type'][] = ['copo', 'estrella', 'arbol', 'regalo', 'campana', 'baston'];

        const generatedItems: FloatingItem[] = [];
        for (let i = 0; i < 18; i++) {
            generatedItems.push({
                id: i,
                size: Math.random() * 40 + 20,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 8,
                duration: Math.random() * 10 + 14,
                rotation: Math.random() * 360,
                type: itemTypes[Math.floor(Math.random() * itemTypes.length)],
            });
        }
        setFloatingItems(generatedItems);

        const generatedSparkles: Sparkle[] = [];
        for (let i = 0; i < 30; i++) {
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

    const NavidadIcon = ({ type, color }: { type: FloatingItem['type']; color: string }) => {
        switch (type) {
            case 'copo':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                        <path
                            d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"
                            stroke={color}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            opacity="0.85"
                        />
                        <circle cx="12" cy="12" r="1.5" fill={color} opacity="0.9" />
                        <path d="M12 5l-1.5 1.5M12 5l1.5 1.5M12 19l-1.5-1.5M12 19l1.5-1.5M5 12l1.5-1.5M5 12l1.5 1.5M19 12l-1.5-1.5M19 12l-1.5 1.5" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
                    </svg>
                );
            case 'estrella':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                        <path
                            d="M12 2l2.5 6.5L21 9.5l-5 4.5 1.5 7L12 17.5 6.5 21 8 14 3 9.5l6.5-1L12 2z"
                            fill={color}
                            opacity="0.9"
                        />
                        <path
                            d="M12 2l2.5 6.5L21 9.5l-5 4.5 1.5 7L12 17.5 6.5 21 8 14 3 9.5l6.5-1L12 2z"
                            stroke="#FFF"
                            strokeWidth="0.5"
                            opacity="0.4"
                        />
                    </svg>
                );
            case 'arbol':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                        <path d="M12 2l3 4h-2l3 4h-2l3 4h-2l3 4H7l3-4H8l3-4H9l3-4H10l3-4z" fill={color} opacity="0.85" />
                        <rect x="11" y="18" width="2" height="3" fill="#5C3A21" opacity="0.9" />
                        <circle cx="10" cy="10" r="0.6" fill={goldColor} />
                        <circle cx="14" cy="13" r="0.6" fill={highlightColor} />
                        <circle cx="11" cy="16" r="0.6" fill={goldColor} />
                    </svg>
                );
            case 'regalo':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                        <rect x="4" y="9" width="16" height="12" rx="1" fill={color} opacity="0.9" />
                        <rect x="4" y="9" width="16" height="3" fill={color} opacity="0.7" />
                        <rect x="11" y="9" width="2" height="12" fill="#FFF" opacity="0.8" />
                        <path d="M12 9c-1.5-3-4-3-4-1s2 2 4 1c2 1 4 1 4-1s-2.5-2-4 1z" fill={goldColor} opacity="0.95" />
                    </svg>
                );
            case 'campana':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                        <path
                            d="M12 3c-3 0-5 2-5 5v4l-2 3h14l-2-3V8c0-3-2-5-5-5z"
                            fill={color}
                            opacity="0.9"
                        />
                        <path d="M10 18a2 2 0 004 0" stroke={color} strokeWidth="1.5" fill="none" opacity="0.9" />
                        <circle cx="12" cy="3" r="1" fill={goldColor} opacity="0.95" />
                        <path d="M7 6l-1-1M17 6l1-1" stroke={goldColor} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
                    </svg>
                );
            case 'baston':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                        <path
                            d="M12 22V8a4 4 0 018 0"
                            stroke="#FFF"
                            strokeWidth="3"
                            strokeLinecap="round"
                            opacity="0.95"
                        />
                        <path
                            d="M12 22V8a4 4 0 018 0"
                            stroke={color}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="2 2"
                            opacity="0.9"
                        />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getIconColor = (type: FloatingItem['type']) => {
        switch (type) {
            case 'copo':
                return '#FFFFFF';
            case 'estrella':
                return goldColor;
            case 'arbol':
                return accentColor;
            case 'regalo':
                return highlightColor;
            case 'campana':
                return goldColor;
            case 'baston':
                return highlightColor;
            default:
                return '#FFFFFF';
        }
    };

    return (
        <div className="navidad-banner relative w-full mx-auto overflow-hidden shadow-[0_25px_80px_-20px_rgba(212,36,38,0.45)] border border-white/40 bg-white/30 bg-clip-padding backdrop-filter backdrop-blur-md rounded-3xl">
            <div className="top-glow absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-80 animate-pulse-slow" />
            <div className="bottom-glow absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D42426] to-transparent opacity-70 animate-pulse-slow-reverse" />

            {backgroundImage ? (
                <div className="bg-image relative h-80 md:h-96 w-full" aria-hidden="true">
                    <Image
                        src={backgroundImage}
                        alt="Fondo Navidad Premium"
                        fill
                        style={{ objectFit: 'cover' }}
                        className="brightness-105 contrast-105 saturate-110"
                        priority
                    />
                    <div className="overlay absolute inset-0 bg-gradient-to-br from-[#7A0A1F]/70 via-[#FFF8E7]/40 to-[#1B4332]/60 backdrop-blur-[2px]" />
                </div>
            ) : (
                <div className="gradient-bg h-80 md:h-96 relative overflow-hidden" aria-hidden="true">
                    <div
                        className="main-gradient absolute inset-0 transition-all duration-700"
                        style={{
                            background: `linear-gradient(135deg, ${gradientColors.from} 0%, ${gradientColors.via} 50%, ${gradientColors.to} 100%)`,
                        }}
                    />

                    <div
                        className="wave-pattern absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: `repeating-radial-gradient(circle at 0 0, transparent 0, rgba(255,255,255,0.3) 40px), repeating-linear-gradient(to right, rgba(255,215,0,0.08), rgba(255,215,0,0.08) 1px, transparent 1px, transparent 60px)`,
                        }}
                    />

                    {mounted && (
                        <div className="floating-items absolute inset-0 pointer-events-none">
                            {floatingItems.map((item) => {
                                const animClass =
                                    item.type === 'copo'
                                        ? 'animate-snow-fall'
                                        : 'animate-float-christmas';
                                return (
                                    <div
                                        key={item.id}
                                        className={`absolute ${animClass} opacity-85`}
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
                                        <NavidadIcon type={item.type} color={getIconColor(item.type)} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {mounted && (
                        <div className="sparkles absolute inset-0 pointer-events-none">
                            {sparkles.map((sparkle) => (
                                <div
                                    key={sparkle.id}
                                    className="sparkle absolute animate-twinkle"
                                    style={{
                                        width: `${sparkle.size}px`,
                                        height: `${sparkle.size}px`,
                                        top: `${sparkle.top}%`,
                                        left: `${sparkle.left}%`,
                                        animationDelay: `${sparkle.delay}s`,
                                        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                                        backgroundColor: goldColor,
                                        boxShadow: `0 0 ${sparkle.size * 3}px rgba(255, 215, 0, 0.8)`,
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    <div className="center-glow absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent animate-pulse-slow" />
                    <div className="decorative-circle absolute -top-10 -right-10 w-40 h-40 border-2 border-[#FFD700]/30 rounded-full animate-spin-slow" />
                    <div className="decorative-circle absolute -bottom-8 -left-8 w-32 h-32 border-2 border-[#D42426]/30 rounded-full animate-spin-slow-reverse" />
                </div>
            )}

            <div className="content absolute inset-0 flex flex-col items-center justify-center text-center px-6 md:px-8 z-10 text-[#2D1810]">
                <div className="promo-badge mb-4 px-5 py-2 bg-white/70 backdrop-blur-md rounded-full text-xs md:text-sm font-bold text-[#7A0A1F] shadow-lg border border-[#FFD700]/40 animate-fade-in-down">
                    🎄 Navidad 2026 - Magia para Compartir
                </div>

                {logoSrc && (
                    <div className="logo-container mb-6 flex-shrink-0 relative animate-fade-in-up" style={{ width: '160px', height: '160px' }}>
                        <Image
                            src={logoSrc}
                            alt="Logo Navidad"
                            fill
                            sizes="(max-width: 768px) 160px, 200px"
                            style={{ objectFit: 'contain' }}
                            className="drop-shadow-[0_10px_30px_rgba(212,36,38,0.35)] animate-pulse-glow"
                        />
                    </div>
                )}

                <h1 className="title text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight leading-tight animate-fade-in-up">
                    <span className="gradient-text bg-clip-text text-transparent bg-gradient-to-r from-[#D42426] via-[#FFD700] to-[#2D5016] animate-gradient-shift">
                        {title}
                    </span>
                </h1>

                {subtitle && (
                    <p className="subtitle text-lg md:text-xl lg:text-2xl mb-6 max-w-2xl font-medium text-[#3A2820] animate-fade-in-up delay-200">
                        {subtitle}
                    </p>
                )}

                {ctaText && (
                    <button className="cta-button mt-2 px-8 py-3.5 bg-gradient-to-r from-[#D42426] to-[#7A0A1F] text-white font-bold rounded-full shadow-lg hover:shadow-[0_10px_30px_rgba(212,36,38,0.5)] hover:scale-105 transition-all duration-300 animate-fade-in-up delay-500 group border border-[#FFD700]/50">
                        <span className="button-content flex items-center gap-2 relative z-10">
                            {ctaText}
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </span>
                        <div className="button-shimmer absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full" />
                    </button>
                )}

                <div className="category-tags flex flex-wrap justify-center gap-2 mt-6 animate-fade-in-up delay-700">
                    {['🎄 Tradición', '✨ Magia', '🎁 Regalos', '⛄ Navidad'].map((tag, index) => (
                        <span
                            key={tag}
                            className="tag px-4 py-1.5 bg-white/60 backdrop-blur-sm rounded-full text-xs md:text-sm font-medium text-[#2D1810] border border-[#FFD700]/40 hover:bg-white/90 hover:border-[#D42426]/50 transition-all duration-300 cursor-default hover:scale-105 hover:shadow-md"
                            style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {children}

            <div className="depth-effect absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FFF8E7]/90 via-[#FFF8E7]/40 to-transparent pointer-events-none" />

            <div className="bottom-decoration absolute bottom-4 left-0 right-0 flex justify-center gap-6 opacity-80 pointer-events-none">
                <div className="w-8 h-8 animate-float-christmas" style={{ animationDelay: '0s' }}>
                    <NavidadIcon type="copo" color="#FFFFFF" />
                </div>
                <div className="w-8 h-8 animate-float-christmas" style={{ animationDelay: '0.6s' }}>
                    <NavidadIcon type="estrella" color={goldColor} />
                </div>
                <div className="w-8 h-8 animate-float-christmas" style={{ animationDelay: '1.2s' }}>
                    <NavidadIcon type="arbol" color={accentColor} />
                </div>
                <div className="w-8 h-8 animate-float-christmas" style={{ animationDelay: '1.8s' }}>
                    <NavidadIcon type="regalo" color={highlightColor} />
                </div>
                <div className="w-8 h-8 animate-float-christmas" style={{ animationDelay: '2.4s' }}>
                    <NavidadIcon type="campana" color={goldColor} />
                </div>
            </div>

            <style jsx>{`
                @keyframes floatChristmas {
                    0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
                    25% { transform: translateY(-12px) translateX(8px) rotate(6deg); }
                    50% { transform: translateY(-4px) translateX(-6px) rotate(-4deg); }
                    75% { transform: translateY(-18px) translateX(4px) rotate(4deg); }
                }
                @keyframes snowFall {
                    0% { transform: translateY(-20%) translateX(0) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.9; }
                    50% { transform: translateY(50%) translateX(20px) rotate(180deg); }
                    100% { transform: translateY(120%) translateX(-10px) rotate(360deg); opacity: 0; }
                }
                @keyframes twinkle {
                    0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
                    50% { opacity: 1; transform: scale(1.6) rotate(180deg); }
                }
                @keyframes pulseGlow {
                    0%, 100% { filter: drop-shadow(0 0 15px rgba(212, 36, 38, 0.4)); }
                    50% { filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.7)); }
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
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 0.9; }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes spinSlow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-float-christmas { animation: floatChristmas 14s ease-in-out infinite; }
                .animate-snow-fall { animation: snowFall 20s linear infinite; }
                .animate-twinkle { animation: twinkle 4s ease-in-out infinite; }
                .animate-pulse-glow { animation: pulseGlow 4s ease-in-out infinite; }
                .animate-fade-in-up { animation: fadeInUp 0.9s ease-out forwards; }
                .animate-fade-in-down { animation: fadeInDown 0.7s ease-out forwards; }
                .animate-gradient-shift { background-size: 200% 200%; animation: gradientShift 8s ease infinite; }
                .animate-pulse-slow { animation: pulseSlow 6s ease-in-out infinite; }
                .animate-pulse-slow-reverse { animation: pulseSlow 6s ease-in-out infinite reverse; }
                .animate-spin-slow { animation: spinSlow 30s linear infinite; }
                .animate-spin-slow-reverse { animation: spinSlow 35s linear infinite reverse; }
                .cta-button:hover .button-shimmer {
                    animation: shimmer 1.5s infinite;
                }
                .delay-200 { animation-delay: 0.2s !important; }
                .delay-500 { animation-delay: 0.5s !important; }
                .delay-700 { animation-delay: 0.7s !important; }
                .navidad-banner { position: relative; }
                .top-glow, .bottom-glow { position: absolute; z-index: 5; }
                .bg-image, .gradient-bg { position: relative; }
                .overlay, .main-gradient, .wave-pattern, .floating-items, .sparkles, .center-glow, .decorative-circle { position: absolute; }
                .content { position: absolute; z-index: 20; }
                .promo-badge { position: relative; z-index: 25; }
                .logo-container { position: relative; z-index: 22; }
                .title, .subtitle { position: relative; z-index: 21; }
                .gradient-text { -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                .cta-button { position: relative; overflow: hidden; cursor: pointer; z-index: 25; transform-origin: center; }
                .button-content { position: relative; }
                .button-shimmer { position: absolute; }
                .category-tags { position: relative; z-index: 21; }
                .tag { transition: all 0.3s ease; }
                .bottom-decoration { position: absolute; z-index: 8; }
                .depth-effect { position: absolute; z-index: 10; }
                @media (max-width: 768px) {
                    .title { font-size: 2rem; }
                    .subtitle { font-size: 1.1rem; }
                    .promo-badge { font-size: 0.75rem; padding: 0.4rem 0.8rem; }
                    .bottom-decoration { gap: 4px; }
                    .bottom-decoration > div { width: 24px !important; height: 24px !important; }
                }
            `}</style>
        </div>
    );
}