import Banner from "./components/baner/Banner";
import { Metadata } from "next";
import Image from "next/image";


import CategoryResumenCard from "./components/categoryresumencard/CategoryResumenCard";
import NavidadBanner from "./components/navideño2026/NavidadBanner";


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
    <h3 className="text-lg font-bold dark:text-white mb-2">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 text-sm">{description}</p>
  </div>
);

export default async function Home() {
  // 1. Fetch a la API local (como lo tenías, esto está perfecto para desarrollar)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/gestion/public/categorias/resumen`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Error al cargar categorías");
  }

  // 2. Definimos el tipo EXACTO que ahora devuelve nuestra API corregida
  const categorias: {
    categoria: string;
    total: number;
    desde: number;
    imagenes?: string[];
  }[] = await res.json();

  return (
    <>
      {/* Hero Banner */}
      <div className="relative">
        <Banner />
      </div>

<NavidadBanner
    title="Feliz Navidad"
    subtitle="Que la magia de estas fiestas ilumine tu hogar"
 
  
/>

     
      <br />

      {/* Sección: Valor principal + CTAs */}
      <section className="py-16 dark:bg-gray-900">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold dark:text-white leading-tight">
              Suministros Alimenticios <span className="text-amber-600">de Calidad Profesional</span>
            </h1>
            <p className="text-lg dark:text-gray-300 mt-6 mb-8 leading-relaxed">
              Abastecé tu negocio con productos frescos, envasados y de primera línea.
              Precios mayoristas, entregas el el mismo Día y atención personalizada para kioscos, bodegas, restaurantes y minimercados.
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
            <div className="dark:bg-gray-800 p-4 rounded-xl shadow-lg max-w-md w-full">
              <Image
                src="/img/El-Vaquiano.png"
                alt="Productos alimenticios de Distribuidora El Vaquiano"
                className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
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
          <h2 className="text-3xl font-bold text-center dark:text-white mb-4">
            ¿Por qué elegirnos?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Soluciones pensadas para el crecimiento de tu negocio
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Benefit
              icon="🚚"
              title="Entregas el el mismo Día"
              description="Zona de influencia con entregas el el mismo Día. Ideal para reposición urgente."
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
            {categorias.map((cat, index) => (
              <CategoryResumenCard
                key={`${cat.categoria}-${index}`}
                categoria={cat.categoria}
                total={cat.total}
                desde={cat.desde}
               
              />
            ))}
          </div>
        </div>
      </section>

{/* CTA final estratégico - Orientado a Proveeduría Mayorista */}
<section className="relative py-20 overflow-hidden bg-gradient-to-br from-[#0a2e0a] via-[#0f3d0f] to-[#145214]">
  {/* Elementos decorativos de fondo sutiles */}
  <div className="absolute inset-0 opacity-10 pointer-events-none">
    <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
    <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-400 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2" />
  </div>

  <div className="relative container mx-auto px-4 md:px-6">
    <div className="max-w-4xl mx-auto text-center">
      
      {/* Badge de confianza */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-6">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-sm text-white/90 font-medium tracking-wide">
          Proveedores de confianza para comercios de barrio
        </span>
      </div>

      {/* Headline principal: Directo al dolor y la solución */}
      <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
        Abastecé tu comercio con <span className="text-amber-400">precios mayoristas</span> y{' '}
        <span className="text-amber-400">entrega en el día</span>
      </h2>

      {/* Subheadline */}
      <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed max-w-3xl mx-auto">
        Ya sea que estés abriendo tu almacén, supermercado o kiosco, te ofrecemos la mercadería que necesitás, cuando la necesitás. Sin que tu estantería quede vacía.
      </p>

      {/* Grid de beneficios clave para el comerciante */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/15 hover:-translate-y-1 transition-all duration-300">
          <div className="text-4xl mb-3">🚚</div>
          <h3 className="text-white font-bold text-lg mb-2">Entrega en el día</h3>
          <p className="text-white/70 text-sm">
            ¿Se te terminó un producto? Hacé tu pedido y te lo llevamos hoy mismo. Tu negocio nunca se detiene.
          </p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/15 hover:-translate-y-1 transition-all duration-300">
          <div className="text-4xl mb-3">💰</div>
          <h3 className="text-white font-bold text-lg mb-2">Precios Mayoristas Reales</h3>
          <p className="text-white/70 text-sm">
            Márgenes de ganancia pensados para que tu comercio sea rentable desde el primer día.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/15 hover:-translate-y-1 transition-all duration-300">
          <div className="text-4xl mb-3">🤝</div>
          <h3 className="text-white font-bold text-lg mb-2">Asesoramiento Comercial</h3>
          <p className="text-white/70 text-sm">
            ¿Recién empezás? Te ayudamos a armar tu primer pedido con los productos de mayor rotación.
          </p>
        </div>
      </div>

      {/* Garantía / Prueba social */}
      <div className="bg-amber-400/20 border border-amber-400/30 rounded-xl p-4 mb-8 inline-block max-w-2xl">
        <p className="text-white font-semibold flex flex-col sm:flex-row items-center gap-2 justify-center text-center sm:text-left">
          <span className="text-2xl">📦</span>
          <span>Mínimos de compra accesibles · Atención personalizada por WhatsApp · </span>
        </p>
      </div>

      {/* CTAs principales */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
     
        <a
          href="https://wa.me/5492224492051?text=Hola,%20tengo%20un%20comercio%20y%20quiero%20conocer%20sus%20precios%20mayoristas%20y%20condiciones%20de%20entrega%20en%20el%20día."
          className="group bg-transparent border-2 border-white text-white hover:bg-white/10 hover:border-amber-400 font-bold px-8 py-4 rounded-xl text-lg transition-all duration-300 flex items-center justify-center gap-2"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Hacer mi primer pedido
        </a>
      </div>

      {/* Micro-copy de urgencia y cercanía */}
      <p className="text-white/60 text-sm mt-4">
        💡 ¿Recién empezás? Preguntanos por nuestro "Kit de Inicio para Almacenes" con los productos de mayor rotación.
      </p>
    </div>
  </div>
</section>
    </>
  );
}