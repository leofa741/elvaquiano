'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Swal from 'sweetalert2';
import { jsPDF } from "jspdf";
import { FaWhatsapp, FaDownload } from "react-icons/fa";
import formatCurrency from '@/app/lib/formatcurrenci';
import { calculateDiscount } from '@/app/lib/parsePrice';

// Función para parsear precios con formato local (ej: "39.000" → 39000)
const parsePrice = (price: any): number => {
  if (typeof price === 'number') return price;
  if (typeof price !== 'string') return 0;
  return parseFloat(price.replace(/\./g, '').replace(',', '.')) || 0;
};

const getSubtotal = (unit_price: any, quantity: number): number => {
  return parsePrice(unit_price) * quantity;
};

const calculateTotal = (data: { unit_price: any; quantity: number }[]): number => {
  return data.reduce((total, item) => total + getSubtotal(item.unit_price, item.quantity), 0);
};


export default function CheckoutConfirmation() {
  const [purchaseData, setPurchaseData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedPurchase = localStorage.getItem('purchaseData');
      if (storedPurchase) {
        setPurchaseData(JSON.parse(storedPurchase));
      } else {
        router.push('/');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        Swal.fire({
          title: 'Error',
          text: 'No se encontró un token JWT válido. Por favor, inicia sesión nuevamente.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
        router.push('/login');
        return;
      }

      let userId;
      try {
        const decodedToken: any = jwtDecode(token);
        userId = decodedToken.id;
      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: 'Error al decodificar el token JWT. Por favor, inicia sesión nuevamente.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
        router.push('/login');
        return;
      }

      fetch(`/api/user/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al obtener los datos del usuario');
          }
          return response.json();
        })
        .then((data) => {
          setUserData(data);
          setLoading(false);
        })
        .catch(() => {
          Swal.fire({
            title: 'Error',
            text: 'Ocurrió un error inesperado. Por favor, intenta más tarde.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          });
          setLoading(false);
          router.push('/');
        });
    }
  }, [router]);

  const createWhatsappMessage = () => {
    if (purchaseData.length === 0 || !userData) return '';
    const purchaseSummary = purchaseData.map(item => `
*Producto:* ${item.productName}
   ID: ${item.id}
   Precio Unitario: $${formatCurrency(parsePrice(item.unit_price))}
   Cantidad: ${item.quantity}
   Subtotal: $${formatCurrency(getSubtotal(item.unit_price, item.quantity))}
    ${item.cashDiscountEnabled ?
        `*Descuento:* 10% por pago en efectivo
   Precio con descuento: $${formatCurrency(getSubtotal(item.unit_price, item.quantity) - calculateDiscount(item.unit_price, item.quantity, item.cashDiscountEnabled))}` : ''}


`).join('\n');

    return `
*¡Hola! Quiero realizar una compra*
---
*Datos del Cliente:*
   Nombre: ${userData.name}
   Correo: ${userData.email}
   Dirección: ${userData.address}, ${userData.city}, ${userData.zipCode}
   Teléfono: ${userData.phone}
---
*Detalles de la Compra:*
${purchaseSummary}
---
*Total de la Compra:* $${formatCurrency(calculateTotal(purchaseData))}
${purchaseData.some(item => item.cashDiscountEnabled) ?
        `*Total con descuento:* $${formatCurrency(calculateTotal(purchaseData) - calculateDiscount(purchaseData[0].unit_price, purchaseData[0].quantity, purchaseData[0].cashDiscountEnabled))}` : ''}
---

¡Gracias por tu atención! Estoy esperando tu respuesta.
    `;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.addImage("../img/f_avicon_1.png", "PNG", 15, 10, 20, 20);
    doc.setFontSize(20);
    doc.setTextColor("#333333");
    doc.text("Comprobante de Compra", 70, 20);
    doc.setFontSize(12);
    doc.setTextColor("#555555");
    doc.text(`Nombre: ${userData.name}`, 20, 40);
    doc.text(`Correo: ${userData.email}`, 20, 50);
    doc.text(`Dirección: ${userData.address}, ${userData.city}, ${userData.zipCode}`, 20, 60);
    doc.text(`Teléfono: ${userData.phone}`, 20, 70);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 80);
    doc.text(`ID de compra: ${Math.random().toString(36).substring(2, 15)}`, 20, 90);

    doc.setFontSize(16);
    doc.setTextColor("#333333");
    doc.text("Detalles de la Compra:", 20, 100);

    let y = 110;
    purchaseData.forEach((item) => {
      doc.setFontSize(14);
      doc.setTextColor("#2c3e50");
      doc.text(`Producto: ${item.productName}`, 20, y);
      doc.setFontSize(12);
      doc.setTextColor("#555555");
      doc.text(`ID: ${item.id}`, 20, y + 10);
      doc.text(`Precio Unitario: $${formatCurrency(parsePrice(item.unit_price))}`, 20, y + 20);
      doc.text(`Cantidad: ${item.quantity}`, 20, y + 30);
      doc.text(`Subtotal: $${formatCurrency(getSubtotal(item.unit_price, item.quantity))}`, 20, y + 40);
      if (item.cashDiscountEnabled) {
        doc.text(`Descuento: 10% por pago en efectivo`, 20, y + 50);
        doc.text(`Precio con descuento: $${formatCurrency(getSubtotal(item.unit_price, item.quantity) - calculateDiscount(item.unit_price, item.quantity, item.cashDiscountEnabled))}`, 20, y + 60);
      }

      if (item.image) {
        doc.addImage(item.image, "JPEG", 150, y, 40, 40);
      }
      y += 70;
    });

    doc.setFontSize(16);
    doc.setTextColor("#2c3e50");
    doc.text(`Total: $${formatCurrency(calculateTotal(purchaseData))}`, 20, y);
    if (purchaseData.some(item => item.cashDiscountEnabled)) {
      doc.text(`Total con descuento: $${formatCurrency(calculateTotal(purchaseData) - calculateDiscount(purchaseData[0].unit_price, purchaseData[0].quantity, purchaseData[0].cashDiscountEnabled))}`, 20, y + 10);
    }

    doc.save("comprobante_compra.pdf");

    Swal.fire({
      title: "Comprobante generado",
      text: "El comprobante ha sido generado y descargado.",
      icon: "success",
      confirmButtonText: "Aceptar",
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce delay-100"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Confirmación de Compra</h1>

      {purchaseData.length > 0 && userData ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">Gracias por tu compra!</h2>

          <div className="bg-gray-100 p-4 mb-6 rounded-md">
            <h3 className="text-lg font-medium">Datos del Usuario</h3>
            <p><strong>Nombre:</strong> {userData.name}</p>
            <p><strong>Correo:</strong> {userData.email}</p>
            <p><strong>Dirección:</strong> {userData.address}, {userData.city}, {userData.zipCode}</p>
            <p><strong>Teléfono:</strong> {userData.phone}</p>
          </div>

          <h3 className="text-lg font-medium mb-2">Detalles de la Compra</h3>
          <ul className="list-disc pl-5 mb-6">
            {purchaseData.map((item, index) => (
              <li key={index} className="mb-2">
                <p className="font-semibold">{item.id}</p>
                <p><strong>Producto:</strong> {item.productName}</p>
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-32 h-32 object-cover rounded-md mb-2"
                  />
                )}
                <p><strong>Precio Unitario:</strong> ${formatCurrency(parsePrice(item.unit_price))}</p>
                <p><strong>Cantidad:</strong> {item.quantity}</p>
                <p><strong>Subtotal:</strong> ${formatCurrency(getSubtotal(item.unit_price, item.quantity))}</p>
                <p>


                  {
                    item.cashDiscountEnabled && (
                      <span className="text-green-500 font-semibold">
                        10% de descuento por pago en efectivo
                        <br />
                        Precio con descuento: ${formatCurrency(getSubtotal(item.unit_price, item.quantity) - calculateDiscount(item.unit_price, item.quantity, item.cashDiscountEnabled))}
                      </span>
                    )
                  }
                </p>
              </li>
            ))}
          </ul>

          <p className="text-xl font-bold mt-6">Total: ${formatCurrency(calculateTotal(purchaseData))}

            <br />
            {
              purchaseData.some(item => item.cashDiscountEnabled) && (
                <>

                  <span className="text-green-500 font-semibold">
                    {purchaseData.some(item => item.cashDiscountEnabled) && (
                      <span>
                        {' '}
                        (incluye 10% de descuento por pago en efectivo)
                      </span>
                    )}
                  </span>
                  <br />
                  <span className="text-red-500 font-semibold">
                    {purchaseData.some(item => item.cashDiscountEnabled) && (
                      <span>
                        {' '}
                        (descuento aplicado: ${formatCurrency(calculateDiscount(purchaseData[0].unit_price, purchaseData[0].quantity, purchaseData[0].cashDiscountEnabled))})
                      </span>
                    )}
                  </span>
                  <br />
                  <span className="text-gray-500 font-semibold">
                    Total con descuento: ${formatCurrency(calculateTotal(purchaseData) - calculateDiscount(purchaseData[0].unit_price, purchaseData[0].quantity, purchaseData[0].cashDiscountEnabled))}
                  </span>
                </>
              )
            }

          </p>

          <div className="mt-10 flex flex-col items-center space-y-5 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xl w-full max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Opciones de compra</h2>
            <a
              href={`https://wa.me/+5491151429072?text=${encodeURIComponent(createWhatsappMessage())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-medium px-6 py-3 rounded-xl shadow hover:bg-green-700 hover:shadow-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <FaWhatsapp className="text-2xl" />
              Contactar con el vendedor por WhatsApp
            </a>
            <button
              onClick={generatePDF}
              className="w-full flex items-center justify-center gap-2 bg-[#1E3A8A] text-white font-semibold px-6 py-3 rounded-xl shadow hover:bg-[#1B2E70] hover:shadow-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E3A8A]"
            >
              <FaDownload className="text-xl" />
              Descargar Comprobante
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-600">No se encontraron datos de compra o usuario.</p>
      )}
    </div>
  );
}
