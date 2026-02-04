'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const companyName = 'Distribuidora El Vaquiano';
  const [showShareModal, setShowShareModal] = useState(false);

  // Compartir usando Web Share API nativa
  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Distribuidora El Vaquiano',
          text: 'Productos mayoristas de primera calidad. Embutidos, lácteos, panadería y más.',
          url: window.location.href,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          // Si falla, mostrar modal alternativo
          setShowShareModal(true);
        }
      }
    } else {
      // Si no soporta Web Share API, mostrar modal
      setShowShareModal(true);
    }
  };

  // Compartir en WhatsApp
  const shareWhatsApp = () => {
    const text = encodeURIComponent('Te comparto esta distribuidora mayorista: Distribuidora El Vaquiano - Productos de primera calidad');
    const url = encodeURIComponent(window.location.href);
    window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`, '_blank');
    setShowShareModal(false);
  };

  // Compartir en Instagram (solo link en bio)
  const shareInstagram = () => {
    window.open('https://www.instagram.com/el_vaquiano', '_blank');
    setShowShareModal(false);
  };

  // Copiar link al portapapeles
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('¡Link copiado al portapapeles!');
      setShowShareModal(false);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  return (
    <footer className="relative bg-[#0b1f0b] text-white pt-14 pb-8">
      {/* Degradado de profundidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1f0b] to-[#0f3d0f]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Marca */}
          <div>
            <Image
              src="/El-Vaquiano.png"
              alt="Distribuidora El Vaquiano"
              width={160}
              height={50}
              className="mb-4"
            />
            <p className="text-sm text-white/80 leading-relaxed max-w-xs">
              Distribuidora mayorista de productos alimenticios.
              Stock constante, entregas ágiles y atención directa para comercios.
            </p>
          </div>

          {/* Categorías */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#39FF14]">
              Categorías
            </h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/categoria/carnes" className="hover:text-[#39FF14] transition">
                  Embutidos
                </Link>
              </li>
              <li>
                <Link href="/categoria/lacteos" className="hover:text-[#39FF14] transition">
                  Lácteos y Huevos
                </Link>
              </li>
              <li>
                <Link href="/categoria/panaderia" className="hover:text-[#39FF14] transition">
                  Panadería y Repostería
                </Link>
              </li>
              <li>
                <Link href="/categoria/bebidas" className="hover:text-[#39FF14] transition">
                  Bebidas
                </Link>
              </li>
            </ul>
          </div>

          {/* Atención */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#39FF14]">
              Atención al cliente
            </h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/contact" className="hover:text-[#39FF14] transition">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#39FF14] transition">
                  Acceso clientes
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto + Compartir */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#39FF14]">
              Contacto
            </h3>

            {/* Botón Compartir */}
            <button
              onClick={handleShareNative}
              className="w-full mb-4 py-2.5 px-4 bg-[#39FF14] text-black font-semibold rounded-lg hover:bg-[#28cc10] transition flex items-center justify-center gap-2 shadow-lg"
              aria-label="Compartir página"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Compartir
            </button>

            {/* Redes */}
            <div className="flex items-center gap-3 mb-5">
              <Link
                href="https://www.instagram.com/el_vaquiano"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-[#39FF14] hover:text-black transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.75 2h8.5A5.75 5.75 0 0122 7.75v8.5A5.75 5.75 0 0116.25 22h-8.5A5.75 5.75 0 012 16.25v-8.5A5.75 5.75 0 017.75 2zm4.25 5.5a4.75 4.75 0 100 9.5 4.75 4.75 0 000-9.5zm0 7.8a3.05 3.05 0 110-6.1 3.05 3.05 0 010 6.1zm5.2-7.95a1.15 1.15 0 11-2.3 0 1.15 1.15 0 012.3 0z" />
                </svg>
              </Link>
            </div>

            {/* WhatsApp */}
            <Link
              href="https://api.whatsapp.com/send?phone=5492224492051&text=Hola,%20quiero%20información%20mayorista"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-[#39FF14] transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.52 3.48A11.88 11.88 0 0012 0C5.37 0 0 5.37 0 12a11.93 11.93 0 001.63 6L0 24l6.2-1.63A11.93 11.93 0 0012 24c6.63 0 12-5.37 12-12 0-3.19-1.24-6.19-3.48-8.52z" />
              </svg>
              +54 9 222 449 2051
            </Link>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="border-t border-[#39FF14]/30 mt-12 pt-6 text-center text-sm text-white/60">
          <p>
            © {currentYear} {companyName}. Todos los derechos reservados.
          </p>
          <p className="mt-1">
            Desarrollado por{' '}
            <Link
              href="https://www.tumarca.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#39FF14] hover:underline"
            >
              TuMarca.ar
            </Link>
          </p>
        </div>
      </div>

      {/* Modal de compartir alternativo */}
      {showShareModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="bg-[#0b1f0b] rounded-2xl w-11/12 max-w-md p-6 border-2 border-[#39FF14]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[#39FF14]">Compartir</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-white/80 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={shareWhatsApp}
                className="w-full flex items-center gap-3 p-4 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.52 3.48A11.88 11.88 0 0012 0C5.37 0 0 5.37 0 12a11.93 11.93 0 001.63 6L0 24l6.2-1.63A11.93 11.93 0 0012 24c6.63 0 12-5.37 12-12 0-3.19-1.24-6.19-3.48-8.52z" />
                </svg>
                <span className="font-medium">WhatsApp</span>
              </button>

              <button
                onClick={shareInstagram}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#dc2743] text-white rounded-lg hover:opacity-90 transition"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.75 2h8.5A5.75 5.75 0 0122 7.75v8.5A5.75 5.75 0 0116.25 22h-8.5A5.75 5.75 0 012 16.25v-8.5A5.75 5.75 0 017.75 2zm4.25 5.5a4.75 4.75 0 100 9.5 4.75 4.75 0 000-9.5zm0 7.8a3.05 3.05 0 110-6.1 3.05 3.05 0 010 6.1zm5.2-7.95a1.15 1.15 0 11-2.3 0 1.15 1.15 0 012.3 0z" />
                </svg>
                <span className="font-medium">Instagram</span>
              </button>

              <button
                onClick={copyLink}
                className="w-full flex items-center gap-3 p-4 bg-[#39FF14] text-black rounded-lg hover:bg-[#28cc10] transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Copiar enlace</span>
              </button>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;