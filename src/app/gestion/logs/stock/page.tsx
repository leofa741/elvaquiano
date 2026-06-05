import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import connectDB from "@/app/lib/mongoose";
import LogStockModel from "@/app/models/LogStock";
import StockFilterForm from './components/StockFilterForm';

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function StockLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string; usuario?: string; accion?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const allowedRoles = ['superadmin', 'admin'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/gestion');
  }

  await connectDB();

  const params = await searchParams;

  const productoFilter = params.producto || "";
  const usuarioFilter = params.usuario || "";
  const accionFilter = params.accion || "";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));

  const query: any = {};
  
  if (productoFilter) {
    query.productoNombre = { $regex: productoFilter, $options: "i" };
  }
  
  if (usuarioFilter) {
    query.usuario = { $regex: usuarioFilter, $options: "i" };
  }
  
  if (accionFilter) {
    query.accion = accionFilter;
  }

  const totalLogs = await LogStockModel.countDocuments(query);
  const totalPages = Math.ceil(totalLogs / PAGE_SIZE);

  const logs = await LogStockModel.find(query)
    .sort({ timestamp: -1 })
    .limit(PAGE_SIZE)
    .skip((currentPage - 1) * PAGE_SIZE);

  const getAccionLabel = (accion: string) => {
    switch (accion) {
      case "resetear_cero":
        return { label: "Resetear a Cero", color: "bg-red-900/30 text-red-400" };
      case "cantidad_personalizada":
        return { label: "Cantidad Personalizada", color: "bg-blue-900/30 text-blue-400" };
      case "edicion_manual":
        return { label: "Edición Manual", color: "bg-purple-900/30 text-purple-400" };
      default:
        return { label: accion, color: "bg-gray-900/30 text-gray-400" };
    }
  };

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    if (productoFilter) params.set("producto", productoFilter);
    if (usuarioFilter) params.set("usuario", usuarioFilter);
    if (accionFilter) params.set("accion", accionFilter);
    params.set("page", page.toString());
    return `/gestion/logs/stock?${params.toString()}`;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Bitácora de Cambios de Stock
        </h1>
        <p className="text-gray-400 mt-1">
          Registro de modificaciones de stock realizadas por administradores.
        </p>
        <p className="text-gray-400 mt-1">
          Volver a{" "}
          <a href="/gestion" className="text-amber-400 underline">
            Gestión
          </a>
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 mb-6 shadow-lg">
        <StockFilterForm />
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">📦</div>
          <p className="text-gray-400">
            No se encontraron registros de cambios de stock.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-gray-800 rounded-xl shadow-lg border border-gray-700">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left py-3 px-4 text-xs text-gray-300 uppercase">
                  Fecha y Hora
                </th>
                <th className="text-left py-3 px-4 text-xs text-gray-300 uppercase">
                  Usuario
                </th>
                <th className="text-left py-3 px-4 text-xs text-gray-300 uppercase">
                  Producto
                </th>
                <th className="text-left py-3 px-4 text-xs text-gray-300 uppercase">
                  Acción
                </th>
                <th className="text-left py-3 px-4 text-xs text-gray-300 uppercase">
                  Stock Anterior
                </th>
                <th className="text-left py-3 px-4 text-xs text-gray-300 uppercase">
                  Stock Nuevo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {logs.map((log: any) => {
                const accionInfo = getAccionLabel(log.accion);
                return (
                  <tr key={log._id} className="hover:bg-gray-750 transition">
                    <td className="py-3 px-4 text-gray-300 text-sm">
                      {new Date(log.timestamp).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 text-white text-sm break-all">
                      {log.usuario}
                    </td>
                    <td className="py-3 px-4 text-white text-sm">
                      {log.productoNombre}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs ${accionInfo.color}`}>
                        {accionInfo.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="text-gray-400">Total: <span className="font-semibold text-white">{log.stockTotalAnterior}</span></div>
                        <div className="text-xs text-gray-500 mt-1">
                          {log.stockAnterior.map((s: any, i: number) => (
                            <div key={i}>{s.deposito}: {s.cantidad}</div>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="text-gray-400">Total: <span className="font-semibold text-white">{log.stockTotalNuevo}</span></div>
                        <div className="text-xs text-gray-500 mt-1">
                          {log.stockNuevo.map((s: any, i: number) => (
                            <div key={i}>{s.deposito}: {s.cantidad}</div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalLogs > PAGE_SIZE && (
        <div className="flex justify-between items-center mt-6">
          <span className="text-sm text-gray-400">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <a
                href={buildUrl(currentPage - 1)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
              >
                Anterior
              </a>
            )}
            {currentPage < totalPages && (
              <a
                href={buildUrl(currentPage + 1)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
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