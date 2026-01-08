import { formatARS } from "@/app/lib/formatcurrenci";

const CategoryResumenCard = ({
  categoria,
  total,
  desde,
}: {
  categoria: string;
  total: number;
  desde: number;
}) => (
  <a
    href={`/categoria/${categoria}`}
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
