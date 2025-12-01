/* eslint-disable */
'use client';

import { useCart } from '@/app/context/CartContext';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import swal from 'sweetalert2';
import formatCurrency from '@/app/lib/formatcurrenci';
import StarRating from '../starrating/StarRating';
import Swal from 'sweetalert2';

interface Product {
  id: string;
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  rating: number;
  reviews: number;
  stock: number;
  cashDiscountEnabled?: boolean;
}

export default function DetailClient({ product }: { product: Product }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(false);

  const [zoomStyle, setZoomStyle] = useState({
    backgroundImage: `url(${product.image})`,
    backgroundPosition: '0% 0%',
    backgroundSize: '150%',
    display: 'none',
  });

  const handleZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;

    setZoomStyle({
      ...zoomStyle,
      backgroundPosition: `${x}% ${y}%`,
      display: 'block',
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      ...zoomStyle,
      display: 'none',
    });
  };

  const handleAdd = async () => {
    if (!session || !session.user || !session.user.email) {
      const result = await swal.fire({
        title: "Iniciar sesión",
        text: "Para agregar productos al carrito, debes iniciar sesión.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Iniciar sesión",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        router.push(`/login?callbackUrl=/detail/${product._id}`);
      }
      return;
    }

    setLoading(true);

    try {
      addToCart({
        id: product._id.toString(),
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      });

      await swal.fire({
        title: "Producto agregado",
        text: "El producto ha sido agregado al carrito.",
        icon: "success",
        confirmButtonText: "Aceptar",
      });
    } catch (error) {
      console.error(error);
      await swal.fire({
        title: "Error",
        text: "Ocurrió un error al agregar el producto.",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const discountedPrice = product.cashDiscountEnabled ? product.price * 0.9 : product.price;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative w-full h-[300px] md:w-[400px] md:h-[400px] overflow-hidden rounded-lg shadow-lg group">
          <div className="relative w-full h-full overflow-hidden cursor-crosshair">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 400px"
              placeholder="blur"
              blurDataURL={product.image}
              priority
            />
            <div
              className="absolute inset-0"
              onMouseMove={handleZoom}
              onMouseLeave={handleMouseLeave}
            />
            <div
              className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none transition-opacity duration-300"
              style={zoomStyle}
            />
          </div>
        </div>

        <div className="flex flex-col justify-center px-4 md:px-0">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">{product.name}</h1>

          <StarRating
            productId={product._id}
            currentRating={product.rating}
            reviewCount={product.reviews}
            isLoggedIn={!!session} onNotLoggedIn={function (): void {
              throw new Error('Function not implemented.');
            } }          />

          <p className="text-gray-600 mb-4 mt-2 text-sm md:text-base">{product.description}</p>
          <p className="text-xl md:text-2xl font-semibold text-blue-600 mb-6">${formatCurrency(product.price)}</p>

          {product.cashDiscountEnabled && (
            <p className="text-green-500 font-semibold mb-4 text-sm md:text-base">
              Descuento del 10% por pago en efectivo
              <br />
              Precio con descuento: <span className="text-red-500">${formatCurrency(discountedPrice)}</span>
            </p>
          )}

          <p className="text-gray-600 mb-4">
            {product.stock > 0 ? "Stock disponible" : "Sin Stock"}
          </p>

          <button
            onClick={handleAdd}
            disabled={loading}
            className="w-full bg-yellow-500 text-black font-semibold py-3 rounded-sm hover:bg-yellow-600 transition-all shadow hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Agregando..." : "Agregar al carrito"}
          </button>
          <button
            onClick={() => router.back()}
            className="w-full mt-4 bg-gray-300 text-black font-semibold py-3 rounded-sm hover:bg-gray-400 transition-all shadow hover:shadow-md cursor-pointer"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
