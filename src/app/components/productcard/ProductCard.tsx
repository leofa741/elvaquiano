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

  // ✅ Texto dinámico para el badge de stock (esquina)
  const stockBadgeText = isOutOfStock
    ? 'Sin stock'
    : isLowStock
      ? `⚠️ ${stockTotal}`
      : `✅ en stock`;

  // ✅ Clases condicionales para el badge
  const stockBadgeClasses = isOutOfStock
    ? 'text-red-600 bg-red-50 border-red-200'
    : isLowStock
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-green-600 bg-green-50 border-green-200';

  // ✅ Manejo seguro de la imagen
  const imageSrc = product.imagen && product.imagen.trim() !== ''
    ? product.imagen
    : '/img/no-image.png';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full relative">

      {/* Badge de oferta (esquina superior izquierda) */}
      {hasOffer && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
            OFERTA
          </span>
        </div>
      )}

      {/* 🔹 Badge de stock con cantidad (esquina superior derecha) */}
      <div className="absolute top-2 right-2 z-10">
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${stockBadgeClasses}`}>
          {stockBadgeText}
        </span>
      </div>

      {/* Imagen */}
      <div className="h-40 w-full flex items-center justify-center bg-gray-50">
        <Image
          src={imageSrc}
          alt={product.nombre || 'Producto'}
          width={150}
          height={150}       
          className="object-contain p-2"
          unoptimized
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

          {/* Badge de stock en el cuerpo (refuerzo visual) */}
          <div className="mt-2">
            {isOutOfStock ? (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                Sin stock
              </span>
            ) : isLowStock ? (
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                ⚠️ Últimas {stockTotal} unidades
              </span>
            ) : (
              <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded border border-green-200">
                ✅  en stock
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