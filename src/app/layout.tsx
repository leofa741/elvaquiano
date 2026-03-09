/* eslint-disable */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Montserrat } from "next/font/google";

import "./globals.css";
import Navbar from "./components/navbar/Navbar";
import Footer from "./components/footer/Footer";
import { Providers } from "./providers/Providers";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react"
import Loader from "./components/loading/Loader";
import VersionChecker from "./components/version/VersionChecker";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400"], // Podés elegir los pesos que quieras
});


export const metadata: Metadata = {
  title: "Distribuidora El Vaquiano - Venta Mayorista y Minorista",
  description:
    "Bienvenido a Distribuidora El Vaquiano, donde encontrarás Todo lo que necesitas para tu negocio",
  keywords:
    "distribuidora, venta mayorista, venta minorista, productos para negocios, suministros comerciales, El Vaquiano",
  authors: [{ name: "Distribuidora El Vaquiano", url: "https://elvaquiano.com.ar" }],
  openGraph: {
    title: "Distribuidora El Vaquiano - Venta Mayorista y Minorista",
    description:
      "Bienvenido a Distribuidora El Vaquiano, donde encontrarás Todo lo que necesitas para tu negocio",
    url: "https://elvaquiano.com.ar",
    siteName: "Distribuidora El Vaquiano",
    images: [
      {
        url: "https://elvaquiano.com.ar/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Distribuidora El Vaquiano",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} dark`}
      suppressHydrationWarning={true}>
      <body className="bg-white text-gray-600 dark:bg-[#0d0d0d] dark:text-white transition-colors duration-500">

        <Providers>
          <header>
            <div className="pt-30">
              <Navbar />
            </div>
          </header>
          <main>
            <VersionChecker />
            {children}
            {/* Botón flotante de WhatsApp — versión mejorada */}
            <a
              href="https://wa.me/5492224492051?text=Hola,%20me%20interesa%20un%20producto%20mayorista"
              target="_blank"
              rel="noopener noreferrer"
              className="fixed bottom-6 left-6 z-50"
              aria-label="Chatear por WhatsApp"
            >
              <div className="relative group">
                {/* Fondo verde WhatsApp con hover effect */}
                <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  {/* Ícono de WhatsApp en blanco (SVG para mejor calidad) */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-7 h-7 text-white"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.249-.597-.497-.52-.695-.52-.198 0-.422-.024-.644-.024-.224 0-.596.074-.92.446-.324.372-1.239 1.211-1.239 2.949 0 1.737 1.264 3.425 1.412 3.623.149.199 2.096 3.175 5.077 4.488.71.306 1.262.489 1.69.625.712.227 1.36.195 1.871.124.571-.075 1.758-.719 2.006-1.413.249-.694.249-1.289.174-1.413-.074-.124-.272-.199-.57-.348z" />
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z" />
                  </svg>
                </div>

                {/* Tooltip opcional: solo en escritorio */}
                <div className="absolute bottom-full right-0 mb-2 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow">
                    ¿Necesitás ayuda?
                  </div>
                  {/* Flecha del tooltip */}
                  <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </a>

            <Loader />
            <Analytics />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              limit={3}
              theme="light"
              style={{ zIndex: 9999 }}
            />

          </main>

          <Footer />
        </Providers>

      </body>
    </html>
  );
}