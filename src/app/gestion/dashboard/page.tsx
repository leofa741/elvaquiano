// app/app/gestion/cuentas-corrientes/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import {
  FaUserFriends,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaWhatsapp,
  FaEnvelope,
  FaSearch,
  FaArrowLeft,
  FaCheckCircle
} from 'react-icons/fa';
import Link from 'next/link';

interface CuentaCorriente {
  clienteId: string;
  razonSocial: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  formaPago: string;
  deudaTotal: number;
  pedidosDeudores: number;
  notas: string;
  tieneAlerta: boolean;
  alertaRevisada: boolean;
}

interface Resumen {
  totalAdeudado: number;
  cantidadClientes: number;
}

const FORMA_PAGO_LABEL: Record<string, string> = {
  cuenta_corriente: 'Cta. Corriente',
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  qr: 'QR',
  tarjeta: 'Tarjeta',
  otro: 'Otro'
};

export default function CuentasCorrientesPage() {
  const isAuthorized = useAdminAuthorization();
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<Resumen>({ totalAdeudado: 0, cantidadClientes: 0 });
  const [alertasActivas, setAlertasActivas] = useState(0);
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [filtro, setFiltro] = useState({ search: '', minDeuda: 0, maxDeuda: Infinity });

  useEffect(() => {
    if (!isAuthorized) return;

    const fetchCuentas = async () => {
      try {
        const res = await fetch('/api/gestion/cuentas-corrientes');
        const data = await res.json();
        setResumen({
          totalAdeudado: data.totalAdeudado || 0,
          cantidadClientes: data.cantidadClientes || 0
        });
        setAlertasActivas(data.alertasActivas || 0);
        setCuentas(data.cuentasCorrientes || []);
      } catch (err) {
        console.error('Error al cargar cuentas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCuentas();
  }, [isAuthorized]);

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter(c => {
      const matchesSearch =
        c.razonSocial.toLowerCase().includes(filtro.search.toLowerCase()) ||
        c.nombre.toLowerCase().includes(filtro.search.toLowerCase()) ||
        c.apellido.toLowerCase().includes(filtro.search.toLowerCase()) ||
        c.telefono.includes(filtro.search);
      const matchesDeuda = c.deudaTotal >= filtro.minDeuda && c.deudaTotal <= filtro.maxDeuda;
      return matchesSearch && matchesDeuda;
    });
  }, [cuentas, filtro]);

  const marcarAlertaComoRevisada = async (clienteId: string) => {
    try {
      await fetch(`/api/gestion/cuentas-corrientes/alertas/${clienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisado: true })
      });

      // Actualizar localmente
      setCuentas(prev =>
        prev.map(c =>
          c.clienteId === clienteId ? { ...c, alertaRevisada: true } : c
        )
      );
      setAlertasActivas(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error al marcar alerta como revisada:', err);
    }
  };

  if (!isAuthorized) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
          <FaMoneyBillWave className="text-amber-400" />
          Cuentas Corrientes
        </h1>
        <p className="text-gray-400 mt-1">
          Gestión financiera de clientes con saldo pendiente
        </p>
        <Link
          href="/gestion"
          className="flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-4"
        >
          <FaArrowLeft /> Volver
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div className="text-amber-400 flex items-center gap-2 mb-1">
            <FaMoneyBillWave /> Total adeudado
          </div>
          <div className="text-2xl font-bold text-white">
            ${resumen.totalAdeudado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div className="text-blue-400 flex items-center gap-2 mb-1">
            <FaUserFriends /> Clientes con deuda
          </div>
          <div className="text-2xl font-bold text-white">{resumen.cantidadClientes}</div>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div className="text-red-400 flex items-center gap-2 mb-1">
            <FaExclamationTriangle /> Alertas activas
          </div>
          <div className="text-2xl font-bold text-white">{alertasActivas}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-300 text-sm mb-1">Buscar cliente</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Nombre, razón social o teléfono"
                className="w-full pl-10 pr-4 py-2 bg-gray-750 text-white rounded-lg"
                value={filtro.search}
                onChange={(e) => setFiltro(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1">Deuda mínima</label>
            <input
              type="number"
              className="w-full p-2 bg-gray-750 text-white rounded-lg"
              value={filtro.minDeuda || ''}
              onChange={(e) => setFiltro(prev => ({ ...prev, minDeuda: Number(e.target.value) || 0 }))}
            />
          </div>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-400">Cargando cuentas corrientes...</div>
        ) : cuentasFiltradas.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No hay clientes con deuda pendiente.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750 text-left">
                <tr>
                  <th className="p-4 text-gray-300">Cliente</th>
                  <th className="p-4 text-gray-300">Forma de pago</th>
                  <th className="p-4 text-gray-300 text-right">Deuda total</th>
                  <th className="p-4 text-gray-300 text-center">Pedidos</th>
                  <th className="p-4 text-gray-300 text-center">Notas</th>
                  <th className="p-4 text-gray-300 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {cuentasFiltradas.map((cuenta) => (
                  <tr key={cuenta.clienteId} className="hover:bg-gray-750 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white flex items-center gap-1">
                        {cuenta.razonSocial}
                        {cuenta.tieneAlerta && !cuenta.alertaRevisada && (
                          <FaExclamationTriangle className="text-red-400" title="Alerta de deuda alta" />
                        )}
                      </div>
                      <div className="text-sm text-gray-400">{cuenta.nombre} {cuenta.apellido}</div>
                      <div className="text-xs text-gray-500 mt-1">{cuenta.telefono}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                        {FORMA_PAGO_LABEL[cuenta.formaPago] || cuenta.formaPago}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-bold ${cuenta.deudaTotal > 100000 ? 'text-red-400' : 'text-amber-400'}`}>
                        ${cuenta.deudaTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-gray-300">{cuenta.pedidosDeudores}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-gray-300">{cuenta.notas}</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2 flex-wrap">
                        <Link
                          href={`/gestion/clientes/${cuenta.clienteId}/finanzas`}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                          title="Ver perfil"
                        >
                          Perfil
                        </Link>
                        {cuenta.telefono && (
                          <a
                            href={`https://wa.me/54${cuenta.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300 flex items-center gap-1 text-sm"
                            title="Enviar WhatsApp"
                          >
                            <FaWhatsapp />
                          </a>
                        )}
                        {cuenta.email && (
                          <a
                            href={`mailto:${cuenta.email}`}
                            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-sm"
                            title="Enviar email"
                          >
                            <FaEnvelope />
                          </a>
                        )}
                        {cuenta.tieneAlerta && !cuenta.alertaRevisada && (
                          <button
                            onClick={() => marcarAlertaComoRevisada(cuenta.clienteId)}
                            className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1 text-sm"
                            title="Marcar alerta como revisada"
                          >
                            <FaCheckCircle />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-gray-500 text-sm">
        Datos actualizados en tiempo real • Última actualización: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}