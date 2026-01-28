import { formatARS } from "@/app/lib/formatcurrenci";


// Función para convertir texto en slug amigable para URLs
const slugify = (str: string): string =>
  str
    .normalize("NFD")                    // separa letras de acentos
    .replace(/[\u0300-\u036f]/g, "")  // elimina acentos
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')        // elimina caracteres especiales (manteniendo letras, números, espacios y guiones)
    .replace(/[\s_-]+/g, '-')        // convierte espacios y secuencias de guiones/espacios en un solo guion
    .replace(/^-+|-+$/g, '');


const CategoryResumenCard = ({
  categoria,
  total,
  desde,


}: {
  categoria: string;

  total: number;
  desde: number;
}) => (

  //console.log({ categoria, total, desde }),
  <a
    href={`/categoria/${slugify(categoria)}`}

    className="group block dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1"
  >
    <div className="h-40 bg-gradient-to-br from-amber-600 to-red-600 flex items-center justify-center">
      <h3 className="text-2xl font-extrabold text-white uppercase">
        {categoria}
      </h3>
    </div>

    <div className="p-5 space-y-2">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {total} productos disponibles
      </p>

      <p className="text-lg font-bold text-amber-600">
        Desde {formatARS(desde)}
      </p>

      <p className="text-sm font-semibold text-amber-600 hover:underline">
        Ver categoría →
      </p>
    </div>
  </a>
);

export default CategoryResumenCard;
