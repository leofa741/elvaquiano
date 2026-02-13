
'use client';

import React, { useState, useEffect, useRef } from 'react';
import './valentinepremium.css';

interface ValentinePremiumProps {
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  customStyles?: React.CSSProperties;
  themeColor?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  rotation: number;
  opacity?: number;
}

const ValentinePremium: React.FC<ValentinePremiumProps> = ({
  title = "✨ Feliz Día de San Valentín ✨",
  subtitle = "Celebra el amor con estilo",
  description = "Descubre nuestras ofertas exclusivas para esta fecha tan especial",
  buttonText = "Ver Ofertas",
  onButtonClick,
  customStyles,
  themeColor = '#ff4081'
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Seguimiento del mouse con suavizado
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
        setMousePosition({ x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Generador de partículas flotantes
  useEffect(() => {
    const createParticle = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const particle: Particle = {
        id: Date.now(),
        x: Math.random() * rect.width,
        y: rect.height + 50,
        size: Math.random() * 8 + 4,
        speed: Math.random() * 2 + 1,
        rotation: Math.random() * 360,
        opacity: 1
      };

      setParticles(prev => [...prev, particle]);

      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== particle.id));
      }, 5000);
    };

    const interval = setInterval(createParticle, 200);
    return () => clearInterval(interval);
  }, []);

  // Animación de partículas
  useEffect(() => {
    const animate = () => {
      setParticles(prev =>
        prev.map(p => {
          const rect = containerRef.current?.getBoundingClientRect();
          const maxHeight = rect?.height || 1000;
          
          return {
            ...p,
            y: p.y - p.speed,
            rotation: p.rotation + 0.5,
            opacity: 1 - (p.y / maxHeight)
          };
        })
      );
      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="valentine-premium-container"
      style={{
        perspective: '1000px',
        ...customStyles
      }}
    >
      {/* Capa de fondo con gradiente */}
      <div 
        className="valentine-background"
        style={{
          transform: `rotateX(${mousePosition.y / 20}deg) rotateY(${mousePosition.x / 20}deg)`,
          background: `linear-gradient(135deg, ${themeColor}20 0%, #ff9a9e30 50%, #fad0c420 100%)`
        }}
      />

      {/* Efecto de vidrio */}
      <div className="valentine-glass-effect" />

      {/* Partículas flotantes */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="valentine-particle"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            transform: `rotate(${particle.rotation}deg)`,
            color: particle.size > 6 ? '#ff4081' : '#ffffff',
            fontSize: particle.size > 6 ? '16px' : '10px'
          }}
        >
          {particle.size > 6 ? '❤️' : '✨'}
        </div>
      ))}

      {/* Contenido principal con efecto 3D */}
      <div 
        className="valentine-content-3d"
        style={{
          transform: `translate3d(${-mousePosition.x / 10}px, ${-mousePosition.y / 10}px, 50px) rotateX(${-mousePosition.y / 30}deg) rotateY(${mousePosition.x / 30}deg)`
        }}
      >
        {/* Marco decorativo */}
        <div className="valentine-frame">
          <div className="valentine-corner top-left" />
          <div className="valentine-corner top-right" />
          <div className="valentine-corner bottom-left" />
          <div className="valentine-corner bottom-right" />
        </div>

        {/* Título con efecto glow */}
        <h1 
          className="valentine-title"
          style={{
            textShadow: `0 0 20px ${themeColor}80, 0 0 40px ${themeColor}60`
          }}
        >
          {title}
        </h1>

        {/* Subtítulo */}
        <h2 className="valentine-subtitle">{subtitle}</h2>

        {/* Descripción */}
        <p className="valentine-description">{description}</p>

        {/* Corazón 3D central */}
        <div className="valentine-heart-3d">
          <div className="heart-front">❤️</div>
          <div className="heart-back">❤️</div>
        </div>

        {/* Botón premium 
        <button
          className="valentine-button"
          onClick={onButtonClick}
          style={{
            '--theme-color': themeColor
          } as React.CSSProperties}
        >
          <span className="button-text">{buttonText}</span>
          <span className="button-glow" />
        </button> */}

        {/* Efecto de brillo */}
        <div className="valentine-shine" />
      </div>

      {/* Efecto de neón en los bordes */}
      <div className="valentine-neon-border">
        <div className="neon-edge top" />
        <div className="neon-edge right" />
        <div className="neon-edge bottom" />
        <div className="neon-edge left" />
      </div>
    </div>
  );
};

export default ValentinePremium;