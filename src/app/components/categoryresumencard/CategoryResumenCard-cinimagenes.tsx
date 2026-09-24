import { formatARS } from "@/app/lib/formatcurrenci";
import CategoryImageSlider from "./CategoryImageSlider"; // Importamos el nuevo slider

const slugify = (str: string): string =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const CategoryResumenCard = ({
  categoria = "Sin nombre",
  total = 0,
  desde = 0,
  imagenes = [], // Ahora es un array
}: {
  categoria?: string;
  total?: number;
  desde?: number;
  imagenes?: string[];
}) => {
  return (
    <a
      href={`/categoria/${slugify(categoria)}`}
      className="group relative block overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 dark:backdrop-blur-md transition-all duration-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-2xl hover:shadow-zinc-200/50 dark:hover:shadow-black/40 hover:-translate-y-1"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-zinc-100/50 dark:to-zinc-800/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-20 pointer-events-none" />

      {/* Área visual: Slider si hay imágenes, Fallback si no */}
      <div className="relative h-40 overflow-hidden">
        {imagenes && imagenes.length > 0 ? (
          <CategoryImageSlider imagenes={imagenes} categoria={categoria} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700 transition-all duration-500 group-hover:scale-110 group-hover:ring-zinc-400 dark:group-hover:ring-zinc-500">
              <span className="text-xl font-bold tracking-wide text-zinc-700 dark:text-zinc-200">
                {categoria.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 p-5 space-y-4 bg-white dark:bg-zinc-900/40">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 line-clamp-1 transition-colors duration-300 group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
          {categoria}
        </h3>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent" />

        <div className="flex items-end justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Productos</p>
            <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{total}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Desde</p>
            <p className="text-lg font-bold text-zinc-900 dark:text-white">{formatARS(desde)}</p>
          </div>
        </div>

        <div className="pt-1">
          <span className="inline-flex items-center text-sm font-medium text-zinc-500 dark:text-zinc-400 transition-all duration-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 group-hover:translate-x-1">
            Ver categoría completa
            <svg className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>
      </div>
    </a>
  );
};

export default CategoryResumenCard;