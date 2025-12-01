'use client';

import { SetStateAction, useState } from 'react';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index: any | SetStateAction<null>) => {
    setOpenIndex(openIndex ===  index ? null : index);
  };

  const faqs = [
    {
      question: '¿Cómo puedo realizar una compra?',
      answer: 'Para realizar una compra, simplemente selecciona los productos que deseas, agrégalos al carrito y sigue los pasos para finalizar la compra.',
    },
    {
      question: '¿Cuáles son los métodos de pago disponibles?',
      answer: 'Aceptamos pagos con tarjeta de crédito/débito, transferencia bancaria y efectivo contra entrega en ciertas zonas.',
    },
    {
      question: '¿Puedo devolver un producto?',
      answer: 'Sí, tienes hasta 5 días desde la fecha de recepción del pedido para solicitar una devolución. El producto debe estar en perfecto estado.',
    },
    {
      question: '¿Cuánto tiempo tarda el envío?',
      answer: 'El tiempo de envío depende de tu ubicación. En general, se entrega entre 2 a 7 días hábiles después de confirmado el pago.',
    },
    {
      question: '¿Tienen garantía los productos?',
      answer: 'Sí, todos nuestros productos cuentan con una garantía de 12 meses por defectos de fabricación.',
    },
    // Agrega más preguntas si lo necesitas
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-10">Preguntas Frecuentes</h1>

      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="border rounded-lg overflow-hidden shadow-sm bg-white">
            <button
              className="w-full flex justify-between items-center p-5 text-left font-medium focus:outline-none"
              onClick={() => toggleFAQ(index)}
              aria-expanded={openIndex === index}
            >
              <span>{faq.question}</span>
              <FontAwesomeIcon icon={openIndex === index ? faMinus : faPlus} />
            </button>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                openIndex === index ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <div className="p-5 pt-0 text-gray-600">{faq.answer}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}