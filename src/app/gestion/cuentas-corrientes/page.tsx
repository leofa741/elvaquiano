'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import {
  FaWallet,
  FaArrowLeft,
  FaMoneyBillWave,
  FaUser,
  FaPhone,
  FaExclamationTriangle,
  FaCheck,
  FaSync,
  FaPrint,
  FaHistory,
  FaSearch,
  FaTimes,
  FaFileInvoiceDollar
} from 'react-icons/fa';

import Swal from 'sweetalert2';
import { formatARS } from '@/app/lib/formatcurrenci';

interface CuentaCorriente {
  clienteId: string;
  razonSocial: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  deudaTotal: number;
  pedidosDeudores: number;
  tieneAlerta: boolean;
  umbralUsado: number;
}

interface ClienteBuscado {
  _id: string;
  razonSocial: string;
  nombre?: string;
  apellido?: string;
  email?: string;
}

const FORMAS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'qr', label: 'QR' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'otro', label: 'Otro' },
];

export default function CuentasCorrientesPage() {
  const isAuthorized = useAdminAuthorization();
  const [loading, setLoading] = useState(true);
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [totalAdeudado, setTotalAdeudado] = useState(0);
  const [alertasActivas, setAlertasActivas] = useState(0);

  // 🆕 Estados para la Búsqueda Rápida
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ClienteBuscado[]>([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const fetchCuentas = async () => {
    try {
      const res = await fetch('/api/gestion/cuentas-corrientes', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCuentas(data.cuentasCorrientes || []);
        setTotalAdeudado(data.totalAdeudado || 0);
        setAlertasActivas(data.alertasActivas || 0);
      }
    } catch (err) {
      console.error('Error al cargar cuentas corrientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchCuentas();
    const interval = setInterval(fetchCuentas, 30000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  // 🆕 Efecto Debounce para la búsqueda de clientes (400ms)
  useEffect(() => {
    if (busquedaCliente.length < 2) {
      setResultadosBusqueda([]);
      setMostrarDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/gestion/clientes?search=${encodeURIComponent(busquedaCliente)}`);
        if (res.ok) {
          const data = await res.json();
          setResultadosBusqueda(data.clientes || []);
          setMostrarDropdown(true);
        }
      } catch (err) {
        console.error('Error buscando cliente:', err);
      } finally {
        setBuscando(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [busquedaCliente]);

  // 🆕 Handler para AGREGAR DEUDA / AJUSTE MANUAL
  const handleAgregarDeudaRapida = async (cliente: ClienteBuscado) => {
    setMostrarDropdown(false);
    setBusquedaCliente('');

    const { value: formValues } = await Swal.fire({
      title: `Agregar Deuda / Ajuste Manual`,
      html: `
        <div style="text-align: left; padding: 10px 0;">
          <div style="margin-bottom: 15px; padding: 10px; background: #1f2937; border-radius: 8px; border: 1px solid #374151;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Cliente seleccionado:</div>
            <div style="font-size: 16px; font-weight: bold; color: white;">${cliente.razonSocial}</div>
          </div>
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Monto a cargar a la deuda *</label>
          <input id="swal-monto-cargo" type="number" step="0.01" min="0.01" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" 
            placeholder="0.00" />
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Concepto / Descripción *</label>
          <input id="swal-concepto-cargo" type="text" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" 
            placeholder="Ej: Mercadería entregada, Servicio extra" />
            
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Nota interna (opcional)</label>
          <input id="swal-nota-cargo" type="text" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px;" 
            placeholder="Detalles adicionales..." />
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Agregar a la Deuda',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      background: '#1f2937',
      color: '#fff',
      preConfirm: () => {
        const monto = parseFloat((document.getElementById('swal-monto-cargo') as HTMLInputElement).value);
        const concepto = (document.getElementById('swal-concepto-cargo') as HTMLInputElement).value.trim();
        const nota = (document.getElementById('swal-nota-cargo') as HTMLInputElement).value.trim();

        if (!monto || monto <= 0) {
          Swal.showValidationMessage('El monto debe ser mayor a 0');
          return false;
        }
        if (!concepto) {
          Swal.showValidationMessage('Debes ingresar un concepto o descripción');
          return false;
        }

        return { monto, concepto, nota };
      }
    });

    if (formValues) {
      try {
        const res = await fetch('/api/gestion/cuentas-corrientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: cliente._id,
            tipo: 'ajuste',
            importe: formValues.monto,
            descripcion: formValues.concepto,
            notas: formValues.nota || undefined
          })
        });

        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: '¡Deuda Registrada!',
            html: `
              <div style="text-align: left; padding: 10px 0;">
                <p style="color: #d1d5db; margin-bottom: 8px;">Se agregó un cargo a la cuenta de <strong>${cliente.razonSocial}</strong> por:</p>
                <div style="font-size: 24px; font-weight: bold; color: #f59e0b; margin-bottom: 12px;">${formatARS(formValues.monto)}</div>
                <p style="color: #d1d5db;">Concepto: <strong style="color: white;">${formValues.concepto}</strong></p>
              </div>
            `,
            confirmButtonColor: '#f59e0b',
            background: '#1f2937',
            color: '#fff'
          });
          await fetchCuentas();
        } else {
          const err = await res.json();
          Swal.fire('Error', err.error || 'No se pudo registrar el cargo', 'error');
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Error de conexión con el servidor', 'error');
      }
    }
  };

  // ✅ FUNCIONES ORIGINALES COMPLETAS Y FUNCIONALES
  const handleRegistrarPago = async (cuenta: CuentaCorriente) => {
    const { value: formValues } = await Swal.fire({
      title: `Registrar Pago - ${cuenta.razonSocial}`,
      html: `
        <div style="text-align: left; padding: 10px 0;">
          <div style="margin-bottom: 15px; padding: 10px; background: #1f2937; border-radius: 8px; border: 1px solid #374151;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Deuda actual:</div>
            <div style="font-size: 20px; font-weight: bold; color: #f59e0b;">${formatARS(cuenta.deudaTotal)}</div>
          </div>
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Monto a pagar *</label>
          <input id="swal-monto" type="number" step="0.01" min="0.01" max="${cuenta.deudaTotal}" value="${cuenta.deudaTotal}" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" 
            placeholder="0.00" />
          
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <button type="button" onclick="document.getElementById('swal-monto').value = '${cuenta.deudaTotal}'" 
              style="flex: 1; padding: 6px; background: #374151; color: #f59e0b; border: 1px solid #4b5563; border-radius: 4px; font-size: 11px; cursor: pointer;">
              Total
            </button>
            <button type="button" onclick="document.getElementById('swal-monto').value = '${(cuenta.deudaTotal / 2).toFixed(2)}'" 
              style="flex: 1; padding: 6px; background: #374151; color: #f59e0b; border: 1px solid #4b5563; border-radius: 4px; font-size: 11px; cursor: pointer;">
              Mitad
            </button>
          </div>
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Forma de pago *</label>
          <select id="swal-forma-pago" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;">
            ${FORMAS_PAGO.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
          </select>
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Referencia (opcional)</label>
          <input id="swal-referencia" type="text" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" 
            placeholder="Ej: N° de transacción" />
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Notas (opcional)</label>
          <textarea id="swal-notas" rows="2" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; resize: vertical;" 
            placeholder="Observaciones adicionales"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Registrar Pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      background: '#1f2937',
      color: '#fff',
      preConfirm: () => {
        const monto = parseFloat((document.getElementById('swal-monto') as HTMLInputElement).value);
        const formaPago = (document.getElementById('swal-forma-pago') as HTMLSelectElement).value;
        const referencia = (document.getElementById('swal-referencia') as HTMLInputElement).value;
        const notas = (document.getElementById('swal-notas') as HTMLTextAreaElement).value;

        if (!monto || monto <= 0) {
          Swal.showValidationMessage('El monto debe ser mayor a 0');
          return false;
        }

        if (monto > cuenta.deudaTotal) {
          Swal.showValidationMessage(`El monto no puede superar la deuda (${formatARS(cuenta.deudaTotal)})`);
          return false;
        }

        return { monto, formaPago, referencia, notas };
      }
    });

    if (formValues) {
      try {
        const res = await fetch('/api/gestion/cuentas-corrientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: cuenta.clienteId,
            tipo: 'pago',
            importe: formValues.monto,
            formaPago: formValues.formaPago,
            descripcion: `Pago recibido - ${FORMAS_PAGO.find(f => f.value === formValues.formaPago)?.label}`,
            referencia: formValues.referencia || undefined,
            notas: formValues.notas || undefined
          })
        });

        if (res.ok) {
          const data = await res.json();
          const nuevoSaldo = data.saldoActual || (cuenta.deudaTotal - formValues.monto);

          Swal.fire({
            icon: 'success',
            title: '¡Pago Registrado!',
            html: `
              <div style="text-align: left; padding: 10px 0;">
                <p style="color: #d1d5db; margin-bottom: 8px;">Se registró un pago de:</p>
                <div style="font-size: 24px; font-weight: bold; color: #10b981; margin-bottom: 12px;">${formatARS(formValues.monto)}</div>
                <p style="color: #d1d5db; margin-bottom: 4px;">Forma de pago: <strong style="color: white;">${FORMAS_PAGO.find(f => f.value === formValues.formaPago)?.label}</strong></p>
                <p style="color: #d1d5db; margin-bottom: 4px;">Saldo restante: <strong style="color: #f59e0b;">${formatARS(Math.max(0, nuevoSaldo))}</strong></p>
              </div>
            `,
            confirmButtonColor: '#10b981',
            background: '#1f2937',
            color: '#fff'
          });

          await fetchCuentas();
        } else {
          const err = await res.json();
          Swal.fire('Error', err.error || 'No se pudo registrar el pago', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión con el servidor', 'error');
      }
    }
  };

  const handleGenerarRecibo = async (cuenta: CuentaCorriente) => {
    const { value: formValues } = await Swal.fire({
      title: `Generar Recibo - ${cuenta.razonSocial}`,
      html: `
      <div style="text-align: left; padding: 10px 0;">
        <div style="margin-bottom: 15px; padding: 10px; background: #1f2937; border-radius: 8px; border: 1px solid #374151;">
          <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Deuda actual:</div>
          <div style="font-size: 20px; font-weight: bold; color: #f59e0b;">${formatARS(cuenta.deudaTotal)}</div>
        </div>
        
        <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Monto a cobrar *</label>
        <input id="swal-monto" type="number" step="0.01" min="0.01" value="${cuenta.deudaTotal}" 
          style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" />
        
        <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Forma de pago *</label>
        <select id="swal-forma-pago" 
          style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;">
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="qr">QR</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="cheque">Cheque</option>
          <option value="otro">Otro</option>
        </select>
        
        <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Concepto</label>
        <input id="swal-concepto" type="text" value="Pago de deuda"
          style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" />
      </div>
    `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Generar e Imprimir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      background: '#1f2937',
      color: '#fff',
      preConfirm: () => {
        const monto = parseFloat((document.getElementById('swal-monto') as HTMLInputElement).value);
        const formaPago = (document.getElementById('swal-forma-pago') as HTMLSelectElement).value;
        const concepto = (document.getElementById('swal-concepto') as HTMLInputElement).value;

        if (!monto || monto <= 0) {
          Swal.showValidationMessage('El monto debe ser mayor a 0');
          return false;
        }

        return { monto, formaPago, concepto };
      }
    });

    if (formValues) {
      try {
        const resRecibo = await fetch('/api/gestion/pagos/recibo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: cuenta.clienteId,
            monto: formValues.monto,
            formaPago: formValues.formaPago,
            concepto: formValues.concepto,
            deudaAnterior: cuenta.deudaTotal
          })
        });

        if (!resRecibo.ok) throw new Error('No se pudo generar el recibo');
        const recibo = await resRecibo.json();

        const resCC = await fetch('/api/gestion/cuentas-corrientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: cuenta.clienteId,
            tipo: 'pago',
            importe: formValues.monto,
            formaPago: formValues.formaPago,
            descripcion: `Recibo #${String(recibo.numero).padStart(6, '0')} - ${formValues.concepto}`
          })
        });

        if (resCC.ok) {
          Swal.fire({
            icon: 'success',
            title: '¡Recibo Generado!',
            html: `Recibo <strong>#${String(recibo.numero).padStart(6, '0')}</strong> por <strong>${formatARS(formValues.monto)}</strong><br><br>Abriendo ticket para imprimir...`,
            timer: 2000,
            showConfirmButton: false,
            background: '#1f2937',
            color: '#fff'
          });

          setTimeout(() => {
            window.open(`/gestion/pagos/recibo/${recibo._id}/imprimir`, '_blank');
          }, 1000);

          fetchCuentas();
        } else {
          throw new Error('No se pudo registrar el pago');
        }
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Error de conexión', 'error');
      }
    }
  };

  if (!isAuthorized) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/gestion" className="text-amber-500 hover:text-amber-400 flex items-center gap-1">
          <FaArrowLeft /> Volver a gestión
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FaWallet className="text-amber-400" />
            Cuentas Corrientes
          </h1>
          <p className="text-gray-400 mt-1">Gestión de saldos pendientes, cargos y pagos de clientes.</p>
        </div>

        <div className="flex gap-2">
          <Link href="/gestion/pagos/recibos" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
            <FaHistory /> Ver Historial de Recibos
          </Link>
          <button onClick={fetchCuentas} disabled={loading} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50">
            <FaSync className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* 🆕 SECCIÓN DE BÚSQUEDA RÁPIDA PARA AGREGAR DEUDA */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 shadow-lg relative">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <FaFileInvoiceDollar className="text-amber-400" /> Registro Rápido de Deuda / Ajuste Manual
        </h3>
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar cliente para agregarle una deuda..."
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-10 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all placeholder-gray-500"
              />
              {buscando && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <FaSync className="animate-spin text-amber-400 text-sm" />
                </div>
              )}
              {busquedaCliente.length >= 2 && !buscando && (
                <button 
                  onClick={() => { setBusquedaCliente(''); setResultadosBusqueda([]); setMostrarDropdown(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          {mostrarDropdown && resultadosBusqueda.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
              {resultadosBusqueda.map((cliente) => (
                <button
                  key={cliente._id}
                  onClick={() => handleAgregarDeudaRapida(cliente)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-800 border-b border-gray-800 last:border-0 transition-colors flex justify-between items-center group"
                >
                  <div>
                    <div className="font-medium text-white group-hover:text-amber-400 transition-colors">
                      {cliente.razonSocial}
                    </div>
                    {(cliente.nombre || cliente.apellido) && (
                      <div className="text-xs text-gray-400">{cliente.nombre} {cliente.apellido}</div>
                    )}
                    {cliente.email && <div className="text-xs text-gray-500">{cliente.email}</div>}
                  </div>
                  <FaCheck className="text-gray-600 group-hover:text-amber-400 transition-colors" />
                </button>
              ))}
            </div>
          )}
          
          {mostrarDropdown && busquedaCliente.length >= 2 && resultadosBusqueda.length === 0 && !buscando && (
            <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-4 text-center text-gray-400 text-sm">
              No se encontraron clientes con ese término.
            </div>
          )}
        </div>
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">Total Adeudado</div>
          <div className="text-2xl font-bold text-amber-400">{formatARS(totalAdeudado)}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">Clientes con Deuda</div>
          <div className="text-2xl font-bold text-white">{cuentas.length}</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <FaExclamationTriangle className="text-red-400" /> Alertas Activas
          </div>
          <div className="text-2xl font-bold text-red-400">{alertasActivas} Umbral de Cta. Cte.</div>
        </div>
      </div>

      {/* LISTADO */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-300">Cargando cuentas corrientes...</div>
        ) : cuentas.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No hay clientes con saldo pendiente.</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {cuentas.map((cuenta) => (
              <div key={cuenta.clienteId} className="p-4 hover:bg-gray-750 transition-colors">
                <div className="flex flex-col md:flex-row md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FaUser className="text-amber-400 text-sm" />
                      <span className="font-medium text-white text-lg">{cuenta.razonSocial}</span>
                      {cuenta.tieneAlerta && (
                        <span className="px-2 py-0.5 text-xs bg-red-600 text-white rounded-full flex items-center gap-1">
                          <FaExclamationTriangle size={10} /> Alerta Umbral
                        </span>
                      )}
                    </div>
                    {(cuenta.nombre || cuenta.apellido) && (
                      <div className="text-gray-400 text-sm ml-5">{cuenta.nombre} {cuenta.apellido}</div>
                    )}
                    <div className="flex flex-wrap gap-4 mt-2 ml-5 text-sm text-gray-400">
                      {cuenta.telefono && (
                        <span className="flex items-center gap-1"><FaPhone size={12} /> {cuenta.telefono}</span>
                      )}
                      <span>{cuenta.pedidosDeudores} pedido(s) pendiente(s)</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-2">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Saldo Pendiente</div>
                      <div className="text-2xl font-bold text-amber-400">{formatARS(cuenta.deudaTotal)}</div>
                    </div>
                    <button
                      onClick={() => handleRegistrarPago(cuenta)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                    >
                      <FaMoneyBillWave /> Registrar Pago
                    </button>
                    <button
                      onClick={() => handleGenerarRecibo(cuenta)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
                      title="Generar recibo de pago para imprimir"
                    >
                      <FaPrint /> Generar Recibo
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}