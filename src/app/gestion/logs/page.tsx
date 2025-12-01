// app/gestion/logins/page.tsx
import connectDB from "@/app/lib/mongoose";
import LogModel from "@/app/models/LogLogin";
import FilterForm from "./app/gestion/logins/components/FilterForm";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function LoginsPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; provider?: string; page?: string }>;
}) {
  await connectDB();

  const params = await searchParams;

  const emailFilter = params.email || "";
  const providerFilter = params.provider || "";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));

  const query: any = {};
  if (emailFilter) {
    query.email = { $regex: emailFilter, $options: "i" };
  }
  if (providerFilter) {
    query.provider = providerFilter;
  }

  const totalLogs = await LogModel.countDocuments(query);
  const totalPages = Math.ceil(totalLogs / PAGE_SIZE);

  const logs = await LogModel.find(query)
    .sort({ timestamp: -1 })
    .limit(PAGE_SIZE)
    .skip((currentPage - 1) * PAGE_SIZE);

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case "google":
        return "Google";
      case "credentials":
        return "Email/Contraseña";
      default:
        return provider;
    }
  };

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    if (emailFilter) params.set("email", emailFilter);
    if (providerFilter) params.set("provider", providerFilter);
    params.set("page", page.toString());
    return `/gestion/logs?${params.toString()}`;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Bitácora de Accesos
        </h1>
        <p className="text-gray-400 mt-1">
          Registros de inicio de sesión de usuarios con roles administrativos y de gestión.
        </p>
        <p className="text-gray-400 mt-1">volver a la sección de <a href="/gestion" className="text-amber-400 underline">Gestión</a>.</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 mb-6 shadow-lg">
        <FilterForm />
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">🔍</div>
          <p className="text-gray-400">No se encontraron registros con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-gray-800 rounded-xl shadow-lg border border-gray-700">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-300 uppercase text-xs tracking-wider">
                  Email
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-300 uppercase text-xs tracking-wider">
                  Método
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-300 uppercase text-xs tracking-wider">
                  Fecha y Hora
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {logs.map((log: any) => (
                <tr key={log._id} className="hover:bg-gray-750 transition">
                  <td className="py-3 px-4 text-white text-sm break-all max-w-[200px]">
                    {log.email}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900/30 text-amber-400">
                      {getProviderLabel(log.provider)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300 text-sm">
                    {new Date(log.timestamp).toLocaleString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalLogs > PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <div className="text-sm text-gray-500">
            Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, totalLogs)} de {totalLogs} registros
          </div>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <a
                href={buildUrl(currentPage - 1)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
              >
                Anterior
              </a>
            )}
            <span className="px-3 py-1 text-gray-300">
              Página {currentPage} de {totalPages}
            </span>
            {currentPage < totalPages && (
              <a
                href={buildUrl(currentPage + 1)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
              >
                Siguiente
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
