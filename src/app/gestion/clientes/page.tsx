'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { FaUsers, FaPlus, FaSearch } from 'react-icons/fa';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

interface Cliente {
  _id: string;
  razonSocial: string;
  nombre: string;
  apellido: string;
  telefono: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  formaPago: 'efectivo' | 'transferencia' | 'qr' | 'tarjeta' | 'cuenta_corriente' | 'otro';
  email?: string;
  dni?: string;
  activo: boolean;
  alerta?: {
    umbralDeuda?: number;
    revisado?: boolean;
    ultimaRevision?: string;
    notaAlerta?: string;
  };
}

export default function ClientesPage() {
  const { status, data: session } = useSession();
  const router = useRouter();

  // Estados principales
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // 🔍 Filtros y paginación
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const clientesPorPagina = 10;

  // -------------------------------
  // 🔒 Validación de acceso
  // -------------------------------
  useEffect(() => {
    const validateAccess = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        router.push('/');
        return;
      }

      const token = session?.user?.token || localStorage.getItem('token');
      if (!token) {
        toast.error('Acceso denegado');
        router.push('/');
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!['admin', 'superadmin'].includes(payload.role)) {
          toast.error('Acceso restringido a administradoress');
          router.push('/');
          return;
        }
        setIsAuthorized(true);
      } catch (err) {
        toast.error('Sesión inválida');
        router.push('/');
      }
    };

    validateAccess();
  }, [status, session, router]);

  // -------------------------------
  // 📥 Cargar clientes
  // -------------------------------
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchClientes = async () => {
      try {
        const res = await fetch('/api/gestion/clientes', { cache: 'no-store' });
        if (!res.ok) throw new Error('Error al cargar clientes');
        const data = await res.json();
        setClientes(data);
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los clientes.',
          confirmButtonColor: '#d33',
        });
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchClientes();
  }, [isAuthorized]);

  // -------------------------------
  // 🔍 Filtrado y paginación
  // -------------------------------
  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes;
    const termino = busqueda.toLowerCase();
    return clientes.filter(cliente =>
      cliente.razonSocial.toLowerCase().includes(termino) ||
      cliente.nombre.toLowerCase().includes(termino) ||
      cliente.apellido.toLowerCase().includes(termino) ||
      (cliente.dni && cliente.dni.includes(termino)) ||
      cliente.telefono.includes(termino) ||
      (cliente.email && cliente.email.toLowerCase().includes(termino))||
      (cliente.formaPago && cliente.formaPago.toLowerCase().includes(termino))

    );
  }, [clientes, busqueda]);

  const totalClientes = clientesFiltrados.length;
  const totalPaginas = Math.ceil(totalClientes / clientesPorPagina);
  const clientesPaginados = clientesFiltrados.slice(
    (paginaActual - 1) * clientesPorPagina,
    paginaActual * clientesPorPagina
  );

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  // -------------------------------
  // 🔄 Escuchar eventos SSE
  // -------------------------------
  useEffect(() => {
    if (!isAuthorized) return;

    const eventSource = new EventSource('/api/gestion/clientes/events');

    eventSource.onmessage = (event) => {
      if (event.data === 'ping') return;


      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'nuevo_cliente':
            setClientes(prev => [data.data, ...prev]);
            break;
          case 'cliente_actualizado':
          case 'cliente_reactivado':
          case 'cliente_eliminado':
            setClientes(prev => prev.map(c => (c._id === data.data._id ? data.data : c)));
            break;
        }
      } catch (err) {
        console.error('SSE error:', err);
      }
    };

    eventSource.onerror = () => {
      console.warn('SSE disconnected, closing');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [isAuthorized]);

  // -------------------------------
  // ✅ Funciones para desactivar/reactivar clientes
  // -------------------------------
  const handleDesactivar = async (cliente: Cliente) => {
    const result = await Swal.fire({
      title: '¿Desactivar cliente?',
      text: `¿Seguro que deseas desactivar a "${cliente.razonSocial}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/gestion/clientes/${cliente._id}`, { method: 'DELETE' });
      if (!res.ok) throw await res.json();

      Swal.fire({ icon: 'success', title: '¡Desactivado!', text: 'Cliente desactivado', timer: 2000, showConfirmButton: false });
      setClientes(prev => prev.map(c => (c._id === cliente._id ? { ...c, activo: false } : c)));
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.error || 'No se pudo desactivar el cliente.', confirmButtonColor: '#d33' });
    }
  };

  const handleReactivar = async (cliente: Cliente) => {
    const result = await Swal.fire({
      title: '¿Reactivar cliente?',
      text: `¿Seguro que deseas reactivar a "${cliente.razonSocial}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/gestion/clientes/${cliente._id}`, { method: 'PATCH' });
      if (!res.ok) throw await res.json();

      Swal.fire({ icon: 'success', title: '¡Reactivado!', text: 'Cliente reactivado', timer: 2000, showConfirmButton: false });
      setClientes(prev => prev.map(c => (c._id === cliente._id ? { ...c, activo: true } : c)));
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.error || 'No se pudo reactivar el cliente.', confirmButtonColor: '#d33' });
    }
  };

  const actualizarUmbral = async (clienteId: string, umbral: number) => {
    try {
      const res = await fetch(`/api/gestion/cuentas-corrientes/alertas/${clienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ umbralDeuda: umbral })
      });

      if (!res.ok) throw new Error('Error al actualizar el umbral');

      // ✅ Actualizar localmente sin recargar
      setClientes(prev =>
        prev.map(c =>
          c._id === clienteId
            ? { ...c, alerta: { ...(c as any).alerta, umbralDeuda: umbral } }
            : c
        )
      );

      toast.success('Umbral de alerta actualizado');
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el umbral.',
        confirmButtonColor: '#d33'
      });
    }
  };

  // -------------------------------
  // 🚨 Función para editar umbral con modal
  // -------------------------------

  const editarUmbralConModal = async (cliente: Cliente) => {
    const { value: nuevoUmbral } = await Swal.fire({
      title: `Umbral para ${cliente.razonSocial}`,
      input: 'number',
      inputLabel: 'Monto mínimo para alerta (ARS)',
      inputValue: cliente.alerta?.umbralDeuda || 50000,
      inputAttributes: { min: '0' },
      confirmButtonText: 'Guardar',
      showCancelButton: true,
      confirmButtonColor: '#8b5cf6', // purple-500
      cancelButtonColor: '#6b7280'
    });

    if (nuevoUmbral !== null && !isNaN(Number(nuevoUmbral)) && Number(nuevoUmbral) >= 0) {
      actualizarUmbral(cliente._id, Number(nuevoUmbral));
    }
  };
  // -------------------------------
  // 🚨 Render condicional de aut
  // -------------------------------
  if (!isAuthorized) return <div className="p-6 text-center text-gray-400">Validando acceso...</div>;

  // -------------------------------
  // 🌟 JSX Principal
  // -------------------------------
  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FaUsers className="text-amber-400" />
            Gestión de Clientes
          </h1>
          <p className="text-gray-400 mt-1">
            Administrá contactos, datos fiscales y condiciones de tus clientes.
          </p>
          <p className="text-gray-400 mt-1">
            volver a la sección de <a href="/gestion" className="text-amber-400 underline">Gestión</a>.
          </p>
        </div>
        <Link
          href="/gestion/clientes/nuevo"
          className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center gap-2"
        >
          <FaPlus /> Nuevo Cliente
        </Link>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-6">
        <div className="relative max-w-md">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por razón social, nombre, DNI, teléfono..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Listado */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-300">Cargando clientes...</div>
        ) : clientesPaginados.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            {busqueda ? 'No se encontraron clientes que coincidan con la búsqueda.' : 'No hay clientes registrados.'}
            {!busqueda && (
              <>
                <br />
                <Link href="/gestion/clientes/nuevo" className="text-amber-400 hover:underline">
                  Crear uno nuevo
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-700">
              {clientesPaginados.map((cliente) => (
                <div key={cliente._id} className="p-4 hover:bg-gray-750 transition">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div>
                          <div className="font-medium text-white">
                            {cliente.razonSocial}
                            {!cliente.activo && (
                              <span className="ml-2 text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded">
                                Inactivo
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-300">{cliente.nombre} {cliente.apellido}</div>
                          <div className="text-sm text-gray-400">
                            Tel: {cliente.telefono}
                            {cliente.email && ` • ${cliente.email}`}
                            {cliente.dni && ` • DNI: ${cliente.dni}`}
                          </div>
                          <div className="text-sm text-gray-400">
                            {cliente.direccion && `${cliente.direccion}, `}
                            {cliente.ciudad && `${cliente.ciudad}, `}
                            {cliente.provincia && cliente.provincia}
                          </div>
                          <div className="text-sm text-gray-400">
                            Forma de pago: {cliente.formaPago}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">

                      <Link href={`/gestion/clientes/editar/${cliente._id}`} className="text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center gap-1">
                        Editar
                      </Link>
                      <Link href={`/gestion/pedidos/nuevo?clienteId=${cliente._id}`} className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1">
                        Pedido rápido
                      </Link>
                      {cliente.activo ? (
                        <button onClick={() => handleDesactivar(cliente)} className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1">
                          Eliminar
                        </button>
                      ) : (
                        <button onClick={() => handleReactivar(cliente)} className="text-green-400 hover:text-green-300 text-sm font-medium flex items-center gap-1">
                          Reactivar
                        </button>
                      )}
                      {cliente.formaPago === 'cuenta_corriente' && (
                        <button
                          onClick={() => editarUmbralConModal(cliente)}
                          className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1"
                        >
                          Editar umbral de alerta
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-700">
                <p className="text-gray-400 text-sm">
                  Mostrando {clientesPaginados.length} de {totalClientes} cliente(s)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                    className="px-3 py-1 bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded hover:bg-gray-600 transition"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 bg-gray-700 text-white rounded">
                    {paginaActual} de {totalPaginas}
                  </span>
                  <button
                    onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaActual === totalPaginas}
                    className="px-3 py-1 bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded hover:bg-gray-600 transition"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}








