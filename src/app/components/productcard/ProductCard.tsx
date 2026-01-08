'use client';

import Image from 'next/image';
import { formatARS } from '@/app/lib/formatcurrenci';

export default function ProductCard({ product, onAdd }: any) {
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

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden relative">
      {hasOffer && (
        <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
          OFERTA
        </span>
      )}

      <Image
        src={product.imagen}
        alt={product.nombre}
        width={300}
        height={300}
        className="object-contain mx-auto p-4"
      />

      <div className="p-4 space-y-2">
        <h3 className="font-medium text-gray-800">
          {product.nombre}
        </h3>

        {hasOffer && (
          <p className="text-sm text-gray-400 line-through">
            {formatARS(product.precioMayorista)}
          </p>
        )}

        <p className="text-xl font-bold text-red-600">
          {formatARS(finalPrice)}
        </p>

        {/* Stock */}
        {stockTotal === 0 ? (
          <p className="text-sm text-red-600 font-medium">
            ❌ Sin stock
          </p>
        ) : stockTotal <= product.stockMinimoAlerta ? (
          <p className="text-sm text-amber-600 font-medium">
            ⚠ Últimas unidades
          </p>
        ) : (
          <p className="text-sm text-green-600">
            ✔ Stock disponible
          </p>
        )}

        <button
          onClick={() => onAdd(product)}
          disabled={stockTotal === 0}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition disabled:opacity-50"
        >
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}
