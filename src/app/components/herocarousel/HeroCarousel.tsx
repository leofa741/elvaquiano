/* eslint-disable */
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/pagination';

// SlideOverlay SOLO se encarga del diseño, no de lógica
const SlideOverlay = ({ title }: { title: string }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10">
    <h1 className="text-4xl font-bold text-white mb-4">{title}</h1>
    <p className="text-white mx-auto max-w-md mb-6">
      Descubre lo último en tecnología y gadgets innovadores. ¡No te lo pierdas!
    </p>
    <button 
      onClick={() => window.location.href = '/shop'}
    className="bg-white text-black py-2 px-6 rounded hover:bg-gray-200 transition-all">
      Shop Now
    </button>
  </div>
);

// OfferOverlay adaptado a la estructura que pasamos
const OfferOverlay = ({ offer }: { offer: { id: string; title: string; discount: string; image: string } }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-gradient-to-t from-black/60 via-black/30 to-transparent z-10">
    <h6 className="text-white text-sm uppercase">{offer.discount}</h6>
    <h3 className="text-white text-2xl font-bold mb-4">{offer.title}</h3>
    <button 
      onClick={() => window.location.href = `/detail/${offer.id}`}
    className="bg-primary text-white py-2 px-4 rounded hover:bg-blue-600 transition-all">
      Shop Now
    </button>
  </div>
);

const HeroCarousel = () => {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);

    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []);

  if (!mounted) return null;

  // Seleccionar los últimos productos
  const mainSlides = [...products].lastIndexOf(products[0]) > 0
    ? [...products].slice(0, 6)
    : [...products].slice(0, 6);
  const offers = products.filter((_, index) => index % 2 === 0).slice(5, 8);

  return (
    <div className="container-fluid mb-8 mt-4 ">
      <div className="flex flex-col lg:flex-row px-4 lg:px-20 gap-8">
        {/* Carrusel principal */}
        <div className="lg:w-3/4 w-full h-[430px] relative">
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={0}
            slidesPerView={1}
            autoplay={{ delay: 3000 }}
            pagination={{ clickable: true }}
            loop
          >
            {mainSlides.map((item, i) => (
              <SwiperSlide key={i}>
                <div className="relative w-full h-[630px]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 75vw"
                    className="object-cover"
                    priority
                  />
                  <SlideOverlay title={item.name} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Ofertas laterales */}
        <div className="lg:w-1/4 hidden lg:flex flex-col justify-between">
          {offers.map((offer) => (
            <div key={offer._id} className="relative h-[200px] mb-4 last:mb-0">
              <Image
                src={offer.image}
                alt={offer.name}
                fill
                sizes="(max-width: 1024px) 100vw, 25vw"
                className="object-cover z-0"
                priority
              />
              <OfferOverlay
                offer={{
                  id: offer._id,
                  title: offer.name,
                  discount: 'Nuevo Producto',
                  image: offer.image,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroCarousel;
