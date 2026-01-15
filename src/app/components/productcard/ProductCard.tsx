// src/app/components/productcard/ProductCard.tsx
'use client';

import Image from 'next/image';
import { formatARS } from '@/app/lib/formatcurrenci';

export default function ProductCard({ product, onAdd }: any) {
  const cantidadUnidadText = `${product.cantidadUnidad} ${product.unidad}`;

  const stockTotal = product.stock.reduce(
    (acc: number, s: any) => acc + s.cantidad,
    0
  );

  const hasOffer =
    product.precioOferta &&
    product.precioOferta < product.precioMayorista;

  const finalPrice = hasOffer
    ? product.precioOferta
    : product.precioMayorista;

  const isOutOfStock = stockTotal === 0;
  const isLowStock = !isOutOfStock && stockTotal <= product.stockMinimoAlerta;

  // ✅ Manejo seguro de la imagen
  const imageSrc = product.imagen && product.imagen.trim() !== ''
    ? product.imagen
    : '/img/no-image.png'; // o '/placeholder.svg', etc.
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full relative">
      {/* Badge de oferta */}
      {hasOffer && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
            OFERTA
          </span>
        </div>
      )}

      {/* Imagen */}
      <div className="relative h-40 w-full flex items-center justify-center bg-gray-50">
        <Image
          src={imageSrc}
          alt={product.nombre || 'Producto'}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 33vw"
          className="object-contain p-2"
          priority={false}
        />
      </div>

      {/* Contenido */}
      <div className="p-3 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
            {product.nombre}
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            {cantidadUnidadText}
          </p>

          {hasOffer && (
            <p className="text-xs text-gray-500 mt-1 line-through">
              {formatARS(product.precioMayorista)}
            </p>
          )}

          <p className="text-lg font-bold text-red-600 mt-1">
            {formatARS(finalPrice)}
          </p>

          <div className="mt-2">
            {isOutOfStock ? (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                Sin stock
              </span>
            ) : isLowStock ? (
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded">
                Últimas unidades
              </span>
            ) : (
              <span className="text-xs text-green-600 font-medium">
                En stock
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() =>
            onAdd({
              ...product,
              stockTotal
            })
          }
          disabled={isOutOfStock}
          className={`mt-3 w-full py-2.5 rounded-lg font-semibold transition text-sm
            ${isOutOfStock
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white active:scale-[0.98]'
            }`}
        >
          {isOutOfStock ? 'Sin stock' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  );
}