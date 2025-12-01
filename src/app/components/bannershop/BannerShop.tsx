'use client';

import { useState, useEffect } from 'react';

// o si usas FontAwesome:
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck, faBoxOpen, faCreditCard, faTags } from '@fortawesome/free-solid-svg-icons';

const BannerShop = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Datos de cada slide
  const slides = [
    {
      gradient: 'from-blue-600 to-indigo-700',
      title: '¡Oferta del Día!',
      text: 'No te pierdas la oportunidad de conseguir lo mejor en tecnología a precios irresistibles.',
      buttonText: 'Ver Ofertas',
      buttonLink: '/ofertas',
      //  image: '/icons/icon-sale.png', // Ruta relativa dentro de /public
      icon: faTags // alternativa si usas Font Awesome
    },
    {
      gradient: 'from-green-500 to-teal-600',
      title: '¡Nuevos Productos!',
      text: 'Descubre nuestra última colección de gadgets innovadores y accesorios tecnológicos.',
      buttonText: 'Ver Nuevos',
      buttonLink: '/shop?new=true',
      //  image: '/icons/icon-new-products.png',
      icon: faBoxOpen
    },
    {
      gradient: 'from-purple-600 to-pink-600',
      title: '¡Envío Gratis!',
      text: 'En compras superiores a $50.000 disfruta de envío gratis a todo el país.',
      buttonText: 'Comprar Ahora',
      buttonLink: '/shop',
      //   image: '/icons/icon-truck.png',
      icon: faTruck
    },
    {
      gradient: 'from-red-500 to-orange-500',
      title: '¡Financiación Disponible!',
      text: 'Paga en hasta 12 cuotas sin interés con todos los medios de pago disponibles.',
      buttonText: 'Más Info',
      buttonLink: '/financiacion',
      // image: '/icons/icon-payment.png',
      icon: faCreditCard
    },
  ];

  // Avanzar al siguiente slide automáticamente cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="max-w-full px-2 sm:px-3 lg:px-8 mx-auto mb-4 relative">
      {/* Carrusel */}
      <div
        className={`relative bg-gradient-to-r ${slides[currentSlide].gradient} rounded-2xl overflow-hidden shadow-lg h-[200px] sm:h-[260px] md:h-[300px] text-white transition-all duration-500`}
      >
        {/* Overlay oscuro */}
        <div className="absolute inset-0 bg-black opacity-20"></div>

        {/* Contenido */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between h-full px-5 sm:px-7 py-4 ">
          {/* Texto y botón */}
          <div className="lg:max-w-md">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 leading-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-sm sm:text-base mb-4">
              {slides[currentSlide].text}
            </p>
            <a
              href={slides[currentSlide].buttonLink}
              className="inline-block px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-full shadow-md transition duration-300 text-sm sm:text-base"
            >
              {slides[currentSlide].buttonText}
            </a>
          </div>

          {/* Icono - Solo visible en desktop */}
          <div className="hidden lg:block">
            <FontAwesomeIcon
              icon={slides[currentSlide].icon}
              className=" text-white opacity-90 marker:hover:opacity-100 transition duration-300 *:ease-in-out"

              style={{ fontSize: '160px' }} // Cambia el tamaño del icono
            />

          </div>
        </div>



        {/* Flechas de navegación */}
        <button
          onClick={goToPrev}
          className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-white p-2 rounded-full shadow-md text-gray-800 hover:bg-gray-100 focus:outline-none z-20"
          aria-label="Anterior"
        >
          ❮
        </button>
        <button
          onClick={goToNext}
          className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-white p-2 rounded-full shadow-md text-gray-800 hover:bg-gray-100 focus:outline-none z-20"
          aria-label="Siguiente"
        >
          ❯
        </button>

        {/* Indicadores */}
        <div className="flex justify-center mt-2 space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full ${index === currentSlide ? 'bg-white' : 'bg-gray-400'
                }`}
              aria-label={`Ir al slide ${index + 1}`}
            ></button>
          ))}
        </div>
      </div>

    </div>
  );
};


export default BannerShop;