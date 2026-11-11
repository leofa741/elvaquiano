'use client';

import Image from "next/image";
import { FaTruckFast, FaBox, FaHandsHolding, FaPhone } from "react-icons/fa6";

export default function DistribuidoraBanner() {
  return (
    <div className="relative w-full min-h-[500px] sm:min-h-[600px] bg-[#0b1f0b] overflow-hidden flex items-center justify-center py-10">
      
      {/* Imagen de fondo */}
      <Image
        src="/img/El-Vaquiano.svg"
        width={1920}
        height={800}
        alt="Distribuidora El Vaquiano - Productos alimenticios mayoristas"
        className="absolute inset-0 w-full h-full object-cover opacity-20"
        priority
      />

      {/* Overlay verde corporativo */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f3d0f]/95 to-[#145214]/85"></div>

      {/* Contenido */}
      <div className="relative z-10 flex flex-col justify-center items-center text-white px-4 text-center max-w-4xl mx-auto">
        
        {/* Logo */}
        <Image
          src="/El-Vaquiano.png"
          alt="Distribuidora El Vaquiano"
          width={180}
          height={60}
          className="mb-4 w-40 sm:w-48 h-auto object-contain"
        />

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
          Abastecé tu negocio con los{" "}
          <span className="text-[#39FF14]">mejores precios mayoristas</span>
        </h1>
        
        <p className="text-base sm:text-lg mb-8 max-w-2xl opacity-95">
          Lácteos, bebidas, envasados y más. Entregas rápidas, stock constante y atención personalizada para kioscos, bodegas, restaurantes y minimercados.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <a
            href="https://wa.me/5492224492051?text=Hola,%20quiero%20la%20lista%20de%20precios%20mayorista"
            className="bg-[#39FF14] text-black font-bold px-6 py-3.5 rounded-lg hover:bg-[#2fd10f] transition duration-300"
          >
            Consultar por WhatsApp
          </a>
        </div>

        {/* Valores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl">
          <div className="flex flex-col items-center">
            <FaTruckFast className="text-2xl mb-1 text-[#39FF14]" />
            <span className="text-xs sm:text-sm">Entrega 24-48h</span>
          </div>
          <div className="flex flex-col items-center">
            <FaBox className="text-2xl mb-1 text-[#39FF14]" />
            <span className="text-xs sm:text-sm">Stock Garantizado</span>
          </div>
          <div className="flex flex-col items-center">
            <FaHandsHolding className="text-2xl mb-1 text-[#39FF14]" />
            <span className="text-xs sm:text-sm">Atención Humana</span>
          </div>
          <div className="flex flex-col items-center">
            <FaPhone className="text-2xl mb-1 text-[#39FF14]" />
            <span className="text-xs sm:text-sm">Sin Demoras</span>
          </div>
        </div>
      </div>
    </div>
  );
}
