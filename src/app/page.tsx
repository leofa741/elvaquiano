// app/page.tsx
import Banner from "./components/baner/Banner";
import { Metadata } from "next";
import Image from "next/image";
import CategoryResumenCard from "./components/categoryresumencard/CategoryResumenCard";

export const metadata: Metadata = {
  title: "Distribuidora El Vaquiano - Venta Mayorista y Minorista",
  description:
    "Distribuidora mayorista confiable de productos alimenticios frescos y de primera calidad. Precios competitivos, entrega rápida y atención personalizada para comercios y minoristas.",
  keywords:
    "distribuidora, venta mayorista alimentos, suministros comerciales, productos para kioscos, bodegas, restaurantes, El Vaquiano, distribuidora alimentos Patagonia",
};



// Beneficio clave (icono + texto)
const Benefit = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <div className="text-center p-6">
    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
      <span className="text-amber-700 dark:text-amber-400 text-2xl">{icon}</span>
    </div>
    <h3 className="text-lg font-bold  dark:text-white mb-2">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 text-sm">{description}</p>
  </div>
);



// Datos de categorías destacadas (pueden venir de una API o base de datos)

export default async function Home() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/gestion/public/categorias/resumen`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Error al cargar categorías");
  }

  const categorias: {
    _id: string;
    totalProductos: number;
    precioDesde: number;
  }[] = await res.json();




  return (
    <>
      {/* Hero Banner (ya lo tienes en Banner.tsx) */}
      <div className="relative">
        <Banner />
      </div>



      {/* Sección: Valor principal + CTAs */}
      <section className="py-16  dark:bg-gray-900">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold  dark:text-white leading-tight">
              Suministros Alimenticios <span className="text-amber-600">de Calidad Profesional</span>
            </h1>
            <p className="text-lg  dark:text-gray-300 mt-6 mb-8 leading-relaxed">
              Abastecé tu negocio con productos frescos, envasados y de primera línea.
              Precios mayoristas, entrega rápida y atención personalizada para kioscos, bodegas, restaurantes y minimercados.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">

              <a
                href="/contact"
                className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-amber-600 dark:text-amber-400 border border-amber-600 dark:border-amber-600 font-bold px-6 py-3.5 rounded-lg shadow-md transition duration-300 text-center"
              >
                Solicitar Lista de Precios
              </a>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className=" dark:bg-gray-800 p-4 rounded-xl shadow-lg max-w-md w-full">
              <Image
                src="/img/El-Vaquiano.png"
                alt="Productos alimenticios de Distribuidora El Vaquiano"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                width={400}
                height={400}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios clave */}
      <section className="py-16 dark:bg-gray-950">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-bold text-center  dark:text-white mb-4">
            ¿Por qué elegirnos?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Soluciones pensadas para el crecimiento de tu negocio
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Benefit
              icon="🚚"
              title="Entrega Rápida"
              description="Zona de influencia con entregas en 24-48 hs. Ideal para reposición urgente."
            />
            <Benefit
              icon="💰"
              title="Precios Mayoristas"
              description="Descuentos por volumen y condiciones especiales para clientes frecuentes."
            />
            <Benefit
              icon="✅"
              title="Calidad Garantizada"
              description="Trabajamos con marcas líderes y control riguroso de fechas de vencimiento."
            />
            <Benefit
              icon="📞"
              title="Atención Personalizada"
              description="Un asesor comercial dedicado a tu negocio. Sin chatbots, sin demoras."
            />
          </div>
        </div>
      </section>


      {/* Categorías destacadas */}
      <section className="py-16 dark:bg-gray-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold dark:text-white">
              Nuestras Categorías
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              Explorá lo que tenemos disponible hoy
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {categorias.map((cat: any) => (
              <CategoryResumenCard
                key={cat._id}
                categoria={cat._id}
                total={cat.totalProductos}
                desde={cat.precioDesde}
              />
            ))}
          </div>


        </div>
      </section>


      {/* CTA final estratégico */}
      <section className="py-20 bg-gradient-to-r from-[#0f3d0f] to-[#145214] text-white text-center">

        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            ¿Querés ser cliente mayorista?
          </h2>
          <p className="text-xl max-w-2xl mx-auto opacity-95 mb-8">
            Registrate y accedé a precios exclusivos, listas de precios actualizadas y atención preferencial.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="/contact"
              className="bg-white text-green-700 font-bold px-8 py-4 rounded-lg text-lg hover:bg-green-100 transition duration-300"
            >
              Contactarme como Mayorista
            </a>
            <a
              href="https://wa.me/5492224492051?text=Hola,%20quiero%20ser%20cliente%20mayorista"
              className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-bold px-8 py-4 rounded-lg text-lg transition duration-300"
            >
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}