'use client';

import Link from 'next/link';
import Image from 'next/image';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const companyName = "Distribuidora El Vaquiano";

  return (
    <footer className="bg-red-800 text-white pt-10 pb-6 relative">
      {/* Degradado sutil para profundidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-800 to-red-900"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Logo + Descripción */}
          <div>
            <h3 className="text-xl font-bold mb-3">{companyName}</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Distribuidora mayorista confiable de productos alimenticios frescos y de primera calidad. 
              Servicio ágil, precios competitivos y entrega en toda la región.
            </p>
          </div>

          {/* Categorías */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Categorías</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/categoria/carnes" className="hover:text-amber-300 transition">Embutidos</Link></li>
              <li><Link href="/categoria/lácteos" className="hover:text-amber-300 transition">Lácteos y Huevos</Link></li>
              <li><Link href="/categoria/panadería" className="hover:text-amber-300 transition">Panadería y Repostería</Link></li>
              <li><Link href="/categoria/bebidas" className="hover:text-amber-300 transition">Bebidas y Jugos</Link></li>
            </ul>
          </div>

          {/* Ayuda y Soporte */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Atención al Cliente</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/contact" className="hover:text-amber-300 transition">Contacto</Link></li>
       
            </ul>
          </div>

          {/* Contacto y Redes */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contáctanos</h3>
            <div className="flex space-x-4 mb-5">
              <Link
                href="https://www.instagram.com/el_vaquiano"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="block"
              >
                <div className="bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 012.427 2.427c.636-.247 1.363-.416 2.427-.465C5.879 2.013 6.233 2 8.662 2h.63zm4.335 13.79a1.3 1.3 0 100-2.6 1.3 1.3 0 000 2.6zm-4.55-1.3a1.8 1.8 0 10-3.6 0 1.8 1.8 0 003.6 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
            </div>

            <Link
              href="https://api.whatsapp.com/send?phone=5492224492051&text=Hola,%20necesito%20información%20sobre%20productos%20mayoristas"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-gray-300 hover:text-amber-300 transition"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.249-.597-.497-.52-.695-.52-.198 0-.422-.024-.644-.024-.224 0-.596.074-.92.446-.324.372-1.239 1.211-1.239 2.949 0 1.737 1.264 3.425 1.412 3.623.149.199 2.096 3.175 5.077 4.488.71.306 1.262.489 1.69.625.712.227 1.36.195 1.871.124.571-.075 1.758-.719 2.006-1.413.249-.694.249-1.289.174-1.413-.074-.124-.272-.199-.57-.348z"/>
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z"/>
              </svg>
              +54 9 222 449 2051
            </Link>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="border-t border-red-700 mt-10 pt-6 text-center text-sm text-gray-400">
          <p>&copy; {currentYear} {companyName}. Todos los derechos reservados.</p>
          <p className="mt-1">
            Desarrollado por{' '}
            <Link
              href="https://www.tumarca.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 hover:underline"
            >
              TuMarca.ar
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;