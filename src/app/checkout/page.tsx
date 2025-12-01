'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useCart } from '../context/CartContext';
import Image from 'next/image';
import formatCurrency from '../lib/formatcurrenci';

// Función para parsear precios con formato local (ej: "39.000" → 39000)
const parsePrice = (price: any): number => {
  if (typeof price === 'number') return price;
  if (typeof price !== 'string') return 0;
  return parseFloat(price.replace(/\./g, '').replace(',', '.')) || 0;
};

export default function Checkout() {
  const { cartItems } = useCart(); // Eliminamos "total" del contexto
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);


  // Calcular total directamente desde cartItems
  const totalCalculated = cartItems.reduce((sum, item) => {
    return sum + parsePrice(item.price) * item.quantity;
  }, 0);

  const descuento = cartItems.reduce((acc, item) => {
    if (item.cashDiscountEnabled) {
      return acc + parsePrice(item.price) * item.quantity * 0.1; // 10% de descuento
    }
    return acc;
  }, 0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (cartItems.length === 0) {
      toast.info('Tu carrito está vacío. Agrega productos antes de continuar.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      router.push('/cart');
    }
  }, [cartItems, router]);
  console.log(cartItems);

  const handleConfirmPayment = () => {
    const purchaseSummary = cartItems.map(item => ({
      id: item.id,
      productName: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      image: item.image,
      price: parsePrice(item.price),
      cashDiscountEnabled: item.cashDiscountEnabled,
    }));
    localStorage.setItem('purchaseData', JSON.stringify(purchaseSummary));
    router.push('/checkout/details');
  };

  if (!isClient) {
    return <p className="text-center text-gray-600">Cargando...</p>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Proceso de Pago</h1>

      {cartItems.length === 0 ? (
        <p className="text-gray-600">No hay productos en tu carrito.</p>
      ) : (
        <>
          {/* Vista móvil: Tarjetas */}
          <div className="space-y-4 md:hidden">
            {cartItems.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row items-start gap-4 p-3 border-b bg-white rounded-lg shadow-sm">
                <div className="w-full sm:w-20 h-auto flex-shrink-0">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={120}
                      height={120}
                      className="rounded object-cover w-full h-auto aspect-square"
                      loading="lazy"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="bg-gray-200 w-full h-24 rounded flex items-center justify-center text-xs text-gray-500">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Precio: {formatCurrency(parsePrice(item.price))}
                  </p>
                  <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                  <p className="font-semibold text-gray-700">
                    Subtotal: {formatCurrency(parsePrice(item.price) * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Vista desktop: Tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left text-sm uppercase text-gray-600">
                  <th className="p-3">Producto</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Cantidad</th>
                  <th className="p-3">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3 flex items-center gap-4">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={60}
                          height={60}
                          className="rounded object-cover"
                        />
                      ) : (
                        <span>No Image</span>
                      )}
                      <span className="text-gray-800">{item.name}</span>
                    </td>
                    <td className="p-3">
                      {formatCurrency(parsePrice(item.price))}
                    </td>
                    <td className="p-3">{item.quantity}</td>
                    <td className="p-3 font-semibold">
                      {formatCurrency(parsePrice(item.price) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total y botón de confirmar pago */}
          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center border-t pt-6">
            <div className="text-lg font-semibold">
              Total: {formatCurrency(totalCalculated)}
            </div>
            {

cartItems.some(item => item.cashDiscountEnabled) && (
  <span className="text-sm text-gray-500 mb-4 sm:mb-0">
    Total con descuento: {formatCurrency(totalCalculated - descuento)}
  </span>
)    


}
            

            <button
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              onClick={handleConfirmPayment}
            >
              Confirmar Pago
            </button>
          </div>
        </>
      )}

      <ToastContainer />
    </div>
  );
}
