'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';

interface PrimaveraBannerProps {
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
    type: 'flor' | 'mariposa' | 'hoja' | 'petalo' | 'abeja';
}

interface Sparkle {
    id: number;
    size: number;
    top: number;
    left: number;
    delay: number;
}

export default function PrimaveraBanner({
    title,
    subtitle,
    ctaText,
    backgroundImage,
    logoSrc,
    children,
    gradientColors = {
        from: '#FBC2EB',    
        via: '#FFF9F0',     
        to: '#A8E6CF',      
    },
    accentColor = '#6BCB77', 
    highlightColor = '#FF6B9D', 
}: PrimaveraBannerProps) {
    const [mounted, setMounted] = useState(false);
    const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);

    useEffect(() => {
        setMounted(true);

        const itemTypes: FloatingItem['type'][] = ['flor', 'mariposa', 'hoja', 'petalo', 'abeja'];

        const generatedItems: FloatingItem[] = [];
        for (let i = 0; i < 15; i++) {
            generatedItems.push({
                id: i,
                size: Math.random() * 40 + 20,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 8,
                duration: Math.random() * 10 + 12,
                rotation: Math.random() * 360,
                type: itemTypes[Math.floor(Math.random() * itemTypes.length)],
            });
        }
        setFloatingItems(generatedItems);

        const generatedSparkles: Sparkle[] = [];
        for (let i = 0; i < 25; i++) {
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

    const PrimaveraIcon = ({ type, color }: { type: FloatingItem['type']; color: string }) => {
        switch (type) {
            case 'flor':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                        <circle cx="12" cy="12" r="3" fill={color} opacity="0.9" />
                        {/* SOLUCIÓN: Coordenadas pre-calculadas para evitar discrepancias de punto flotante entre Servidor y Cliente */}
                        {[
                            { cx: 17, cy: 12 },
                            { cx: 13.55, cy: 16.76 },
                            { cx: 7.95, cy: 14.94 },
                            { cx: 7.95, cy: 9.06 },
                            { cx: 13.55, cy: 7.24 }
                        ].map((pos, i) => (
                            <circle key={i} cx={pos.cx} cy={pos.cy} r="3.5" fill={color} opacity="0.6" />
                        ))}
                    </svg>
                );
            case 'mariposa':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                        <path d="M12 12c-2-4-6-6-8-4s0 6 4 8c-2 2-4 5-2 6s5-1 6-3c1 2 4 4 6 3s0-4-2-6c4-2 6-6 4-8s-6 0-8 4z" fill={color} opacity="0.7" />
                        <path d="M12 12 L12 18" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.8" />
                    </svg>
                );
            case 'hoja':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                        <path d="M12 22c-4 0-8-3-8-8 0-6 6-10 10-12 0 4 2 8 6 8 0 5-4 8-8 8z" fill={color} opacity="0.6" />
                        <path d="M12 22 Q12 12 18 10" stroke={color} strokeWidth="1" fill="none" opacity="0.8" />
                    </svg>
                );
            case 'petalo':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                        <path d="M12 22c-3 0-6-4-6-8 0-5 3-10 6-12 3 2 6 7 6 12 0 4-3 8-6 8z" fill={color} opacity="0.5" />
                    </svg>
                );
            case 'abeja':
                return (
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                        <ellipse cx="12" cy="13" rx="5" ry="7" fill="#FFD93D" opacity="0.9" />
                        <path d="M7 11 Q5 8 8 7" stroke="#4A4A4A" strokeWidth="1" fill="none" />
                        <path d="M17 11 Q19 8 16 7" stroke="#4A4A4A" strokeWidth="1" fill="none" />
                        <path d="M8 12 L16 12 M8 14 L16 14 M9 16 L15 16" stroke="#4A4A4A" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="10.5" cy="10.5" r="1" fill="#4A4A4A" />
                        <circle cx="13.5" cy="10.5" r="1" fill="#4A4A4A" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getIconColor = (type: FloatingItem['type']) => {
        if (type === 'abeja') return '#FFD93D';
        if (type === 'flor' || type === 'petalo' || type === 'mariposa') return highlightColor;
        return accentColor;
    };

    return (
        <div className="primavera-banner relative w-full mx-auto overflow-hidden shadow-[0_25px_80px_-20px_rgba(255,107,157,0.35)] border border-white/60 bg-white/40 bg-clip-padding backdrop-filter backdrop-blur-md rounded-3xl">
            <div className="top-glow absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FF6B9D] to-transparent opacity-60 animate-pulse-slow" />
            <div className="bottom-glow absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#6BCB77] to-transparent opacity-60 animate-pulse-slow-reverse" />

            {backgroundImage ? (
                <div className="bg-image relative h-80 md:h-96 w-full" aria-hidden="true">
                    <Image
                        src={backgroundImage}
                        alt="Fondo Primavera Premium"
                        fill
                        style={{ objectFit: 'cover' }}
                        className="brightness-105 contrast-100 saturate-110"
                        priority
                    />
                    <div className="overlay absolute inset-0 bg-gradient-to-br from-white/80 via-[#FFF9F0]/60 to-[#A8E6CF]/50 backdrop-blur-[2px]" />
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
                            backgroundImage: `repeating-radial-gradient(circle at 0 0, transparent 0, rgba(255,255,255,0.4) 40px), repeating-linear-gradient(to right, rgba(107,203,119,0.1), rgba(107,203,119,0.1) 1px, transparent 1px, transparent 60px)`,
                        }}
                    />

                    {mounted && (
                        <div className="floating-items absolute inset-0 pointer-events-none">
                            {floatingItems.map((item) => {
                                const animClass = item.type === 'petalo' || item.type === 'hoja' ? 'animate-petal-fall' : 'animate-float-spring';
                                return (
                                    <div
                                        key={item.id}
                                        className={`absolute ${animClass} opacity-80`}
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
                                        <PrimaveraIcon type={item.type} color={getIconColor(item.type)} />
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
                                    className="sparkle absolute rounded-full animate-twinkle"
                                    style={{
                                        width: `${sparkle.size}px`,
                                        height: `${sparkle.size}px`,
                                        top: `${sparkle.top}%`,
                                        left: `${sparkle.left}%`,
                                        animationDelay: `${sparkle.delay}s`,
                                        backgroundColor: '#FFD93D',
                                        boxShadow: `0 0 ${sparkle.size * 3}px rgba(255, 217, 61, 0.6)`,
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    <div className="center-glow absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent animate-pulse-slow" />
                    <div className="decorative-circle absolute -top-10 -right-10 w-40 h-40 border-2 border-[#FF6B9D]/30 rounded-full animate-spin-slow" />
                    <div className="decorative-circle absolute -bottom-8 -left-8 w-32 h-32 border-2 border-[#6BCB77]/30 rounded-full animate-spin-slow-reverse" />
                </div>
            )}

            <div className="content absolute inset-0 flex flex-col items-center justify-center text-center px-6 md:px-8 z-10 text-[#2D3748]">
                <div className="promo-badge mb-4 px-5 py-2 bg-white/60 backdrop-blur-md rounded-full text-xs md:text-sm font-bold text-[#D63384] shadow-lg border border-white/60 animate-fade-in-down">
                    🌸 Primavera 2026 - Renueva tu Estilo
                </div>

                {logoSrc && (
                    <div className="logo-container mb-6 flex-shrink-0 relative animate-fade-in-up" style={{ width: '160px', height: '160px' }}>
                        <Image
                            src={logoSrc}
                            alt="Logo Primavera"
                            fill
                            sizes="(max-width: 768px) 160px, 200px"
                            style={{ objectFit: 'contain' }}
                            className="drop-shadow-[0_10px_30px_rgba(255,107,157,0.25)] animate-pulse-glow"
                        />
                    </div>
                )}

                <h1 className="title text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight leading-tight animate-fade-in-up">
                    <span className="gradient-text bg-clip-text text-transparent bg-gradient-to-r from-[#D63384] via-[#FF6B9D] to-[#6BCB77] animate-gradient-shift">
                        {title}
                    </span>
                </h1>

                {subtitle && (
                    <p className="subtitle text-lg md:text-xl lg:text-2xl mb-6 max-w-2xl font-medium text-[#4A5568] animate-fade-in-up delay-200">
                        {subtitle}
                    </p>
                )}

                {ctaText && (
                    <button className="cta-button mt-2 px-8 py-3.5 bg-gradient-to-r from-[#FF6B9D] to-[#D63384] text-white font-bold rounded-full shadow-lg hover:shadow-[0_10px_30px_rgba(255,107,157,0.4)] hover:scale-105 transition-all duration-300 animate-fade-in-up delay-500 group">
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
                    {['🌸 Naturaleza', '✨ Renovación', '🌿 Frescura', '☀️ Bienestar'].map((tag, index) => (
                        <span
                            key={tag}
                            className="tag px-4 py-1.5 bg-white/50 backdrop-blur-sm rounded-full text-xs md:text-sm font-medium text-[#2D3748] border border-white/60 hover:bg-white/80 hover:border-[#FF6B9D]/40 transition-all duration-300 cursor-default hover:scale-105 hover:shadow-md"
                            style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {children}

            <div className="depth-effect absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FFF9F0]/90 via-[#FFF9F0]/40 to-transparent pointer-events-none" />

            {/* Esta es la sección que causaba el error porque se renderiza tanto en Servidor como en Cliente sin el flag 'mounted' */}
            <div className="bottom-decoration absolute bottom-4 left-0 right-0 flex justify-center gap-6 opacity-70 pointer-events-none">
                <div className="w-8 h-8 animate-float-spring" style={{ animationDelay: '0s' }}>
                    <PrimaveraIcon type="flor" color={highlightColor} />
                </div>
                <div className="w-8 h-8 animate-float-spring" style={{ animationDelay: '0.6s' }}>
                    <PrimaveraIcon type="mariposa" color={highlightColor} />
                </div>
                <div className="w-8 h-8 animate-float-spring" style={{ animationDelay: '1.2s' }}>
                    <PrimaveraIcon type="hoja" color={accentColor} />
                </div>
                <div className="w-8 h-8 animate-float-spring" style={{ animationDelay: '1.8s' }}>
                    <PrimaveraIcon type="abeja" color="#FFD93D" />
                </div>
                <div className="w-8 h-8 animate-float-spring" style={{ animationDelay: '2.4s' }}>
                    <PrimaveraIcon type="petalo" color={highlightColor} />
                </div>
            </div>

            <style jsx>{`
                @keyframes floatSpring {
                    0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
                    25% { transform: translateY(-15px) translateX(10px) rotate(5deg); }
                    50% { transform: translateY(-5px) translateX(-5px) rotate(-3deg); }
                    75% { transform: translateY(-20px) translateX(5px) rotate(3deg); }
                }
                @keyframes petalFall {
                    0% { transform: translateY(-20%) translateX(0) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.8; }
                    100% { transform: translateY(120%) translateX(30px) rotate(360deg); opacity: 0; }
                }
                @keyframes twinkle {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.5); }
                }
                @keyframes pulseGlow {
                    0%, 100% { filter: drop-shadow(0 0 15px rgba(255, 107, 157, 0.4)); }
                    50% { filter: drop-shadow(0 0 30px rgba(255, 107, 157, 0.7)); }
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
                    50% { opacity: 0.8; }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes spinSlow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-float-spring { animation: floatSpring 14s ease-in-out infinite; }
                .animate-petal-fall { animation: petalFall 18s linear infinite; }
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
                .primavera-banner { position: relative; }
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