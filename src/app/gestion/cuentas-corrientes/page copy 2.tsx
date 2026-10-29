'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import {
  FaWallet, FaArrowLeft, FaMoneyBillWave, FaUser, FaPhone, 
  FaExclamationTriangle, FaCheck, FaSync, FaPrint, FaHistory, 
  FaSearch, FaTimes, FaFileInvoiceDollar, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { FaDollarSign } from 'react-icons/fa6';
import Swal from 'sweetalert2';
import { formatARS } from '@/app/lib/formatcurrenci';

interface Movimiento {
  descripcion: string;
  tipo: string;
  fecha: string;
  importe: number;
  formaPago: string;
}

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
  ultimosMovimientos: Movimiento[];
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

  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ClienteBuscado[]>([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const [filtroLista, setFiltroLista] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;

  const [procesandoPagoId, setProcesandoPagoId] = useState<string | null>(null);

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

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroLista]);

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

  const cuentasFiltradas = useMemo(() => {
    if (!filtroLista.trim()) return cuentas;
    const termino = filtroLista.toLowerCase();
    return cuentas.filter(c => 
      c.razonSocial.toLowerCase().includes(termino) ||
      (c.nombre && c.nombre.toLowerCase().includes(termino)) ||
      (c.apellido && c.apellido.toLowerCase().includes(termino)) ||
      (c.telefono && c.telefono.includes(termino))
    );
  }, [cuentas, filtroLista]);

  const totalPaginas = Math.ceil(cuentasFiltradas.length / itemsPorPagina);
  const cuentasPaginadas = cuentasFiltradas.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  const mostrarModalAgregarDeuda = async (clienteId: string, razonSocial: string) => {
    const { value: formValues } = await Swal.fire({
      title: `Agregar Deuda / Ajuste Manual`,
      html: `
        <div style="text-align: left; padding: 10px 0;">
          <div style="margin-bottom: 15px; padding: 10px; background: #1f2937; border-radius: 8px; border: 1px solid #374151;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Cliente seleccionado:</div>
            <div style="font-size: 16px; font-weight: bold; color: white;">${razonSocial}</div>
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
        if (!monto || monto <= 0) { Swal.showValidationMessage('El monto debe ser mayor a 0'); return false; }
        if (!concepto) { Swal.showValidationMessage('Debes ingresar un concepto o descripción'); return false; }
        return { monto, concepto, nota };
      }
    });

    if (formValues) {
      try {
        const res = await fetch('/api/gestion/cuentas-corrientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: clienteId,
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
            html: `<div style="text-align: left; padding: 10px 0;"><p style="color: #d1d5db; margin-bottom: 8px;">Se agregó un cargo a la cuenta de <strong>${razonSocial}</strong> por:</p><div style="font-size: 24px; font-weight: bold; color: #f59e0b; margin-bottom: 12px;">${formatARS(formValues.monto)}</div><p style="color: #d1d5db;">Concepto: <strong style="color: white;">${formValues.concepto}</strong></p></div>`,
            confirmButtonColor: '#f59e0b', background: '#1f2937', color: '#fff'
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

  const handleAgregarDeudaRapida = async (cliente: ClienteBuscado) => {
    setMostrarDropdown(false);
    setBusquedaCliente('');
    await mostrarModalAgregarDeuda(cliente._id, cliente.razonSocial);
  };

  const handleRegistrarPago = async (cuenta: CuentaCorriente) => {
    if (procesandoPagoId === cuenta.clienteId) {
      Swal.fire({
        icon: 'warning',
        title: 'Procesando...',
        html: `Ya se está registrando un pago para <strong>${cuenta.razonSocial}</strong>.<br><br>Por favor, espera a que el sistema termine de guardar el registro antes de intentar nuevamente.`,
        confirmButtonColor: '#f59e0b',
        background: '#1f2937',
        color: '#fff'
      });
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: `Registrar Pago - ${cuenta.razonSocial}`,
      html: `
        <div style="text-align: left; padding: 10px 0;">
          <div style="margin-bottom: 15px; padding: 10px; background: #1f2937; border-radius: 8px; border: 1px solid #374151;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Deuda actual:</div>
            <div style="font-size: 20px; font-weight: bold; color: #f59e0b;">${formatARS(cuenta.deudaTotal)}</div>
          </div>
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Monto a abonar al capital (Principal) *</label>
          <input id="swal-monto-capital" type="number" step="0.01" min="0.01" max="${cuenta.deudaTotal}" value="${cuenta.deudaTotal}" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 8px;" placeholder="0.00" />
          
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <button type="button" onclick="document.getElementById('swal-monto-capital').value = '${cuenta.deudaTotal}'; document.getElementById('swal-interes').value = '0'; if(window.actualizarTotalesCC) window.actualizarTotalesCC();" 
              style="flex: 1; padding: 6px; background: #374151; color: #f59e0b; border: 1px solid #4b5563; border-radius: 4px; font-size: 11px; cursor: pointer;">Pagar Todo</button>
            <button type="button" onclick="document.getElementById('swal-monto-capital').value = '${(cuenta.deudaTotal / 2).toFixed(2)}'; if(window.actualizarTotalesCC) window.actualizarTotalesCC();" 
              style="flex: 1; padding: 6px; background: #374151; color: #f59e0b; border: 1px solid #4b5563; border-radius: 4px; font-size: 11px; cursor: pointer;">Mitad</button>
          </div>

          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Interés / Recargo (en $, manual sin redondeo)</label>
          <input id="swal-interes" type="number" step="0.01" min="0" value="0" 
            style="width: 100%; padding: 8px 12px; background: #374151; color: #fbbf24; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" placeholder="0.00" />

          <div style="margin-bottom: 15px; padding: 10px; background: #064e3b; border-radius: 8px; border: 1px solid #065f46;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 13px; color: #a7f3d0;">Total a cobrar (Cliente paga):</span>
              <span id="swal-total-cobrar" style="font-size: 16px; font-weight: bold; color: #34d399;">${formatARS(cuenta.deudaTotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #065f46; padding-top: 4px; margin-top: 4px;">
              <span style="font-size: 12px; color: #6ee7b7;">Nueva deuda restante:</span>
              <span id="swal-nueva-deuda" style="font-size: 14px; font-weight: bold; color: #fbbf24;">${formatARS(0)}</span>
            </div>
          </div>

          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Forma de pago *</label>
          <select id="swal-forma-pago" style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;">
            ${FORMAS_PAGO.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
          </select>
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Referencia (opcional)</label>
          <input id="swal-referencia" type="text" style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" placeholder="Ej: N° de transacción" />
          
          <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Notas (opcional)</label>
          <textarea id="swal-notas" rows="2" style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; resize: vertical;" placeholder="Observaciones adicionales"></textarea>
        </div>
      `,
      didOpen: () => {
        const inputCapital = document.getElementById('swal-monto-capital') as HTMLInputElement;
        const inputInteres = document.getElementById('swal-interes') as HTMLInputElement;
        const spanTotal = document.getElementById('swal-total-cobrar');
        const spanNuevaDeuda = document.getElementById('swal-nueva-deuda');

        const actualizarTotales = () => {
          const capital = parseFloat(inputCapital.value) || 0;
          const interes = parseFloat(inputInteres.value) || 0;
          const total = capital + interes;
          const nuevaDeuda = Math.max(0, cuenta.deudaTotal - capital);

          if (spanTotal) spanTotal.textContent = formatARS(total);
          if (spanNuevaDeuda) spanNuevaDeuda.textContent = formatARS(nuevaDeuda);
        };

        (window as any).actualizarTotalesCC = actualizarTotales;

        inputCapital.addEventListener('input', actualizarTotales);
        inputInteres.addEventListener('input', actualizarTotales);
        
        actualizarTotales();
      },
      willClose: () => {
        delete (window as any).actualizarTotalesCC;
      },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Registrar Pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      background: '#1f2937',
      color: '#fff',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const montoCapital = parseFloat((document.getElementById('swal-monto-capital') as HTMLInputElement).value);
        const montoInteres = parseFloat((document.getElementById('swal-interes') as HTMLInputElement).value) || 0;
        const formaPago = (document.getElementById('swal-forma-pago') as HTMLSelectElement).value;
        const referencia = (document.getElementById('swal-referencia') as HTMLInputElement).value;
        const notas = (document.getElementById('swal-notas') as HTMLTextAreaElement).value;
        
        if (!montoCapital || montoCapital <= 0) { Swal.showValidationMessage('El monto al capital debe ser mayor a 0'); return false; }
        if (montoCapital > cuenta.deudaTotal) { Swal.showValidationMessage(`El monto al capital no puede superar la deuda (${formatARS(cuenta.deudaTotal)})`); return false; }
        
        return { montoCapital, montoInteres, formaPago, referencia, notas };
      }
    });

    if (formValues) {
      setProcesandoPagoId(cuenta.clienteId);
      try {
        let descripcionPago = `Pago recibido - ${FORMAS_PAGO.find(f => f.value === formValues.formaPago)?.label}`;
        
        if (formValues.montoInteres > 0) {
          descripcionPago += ` (Incluye ${formatARS(formValues.montoInteres)} de interés/recargo)`;
          
          // 1. Registrar el interés como un ajuste/cargo a la cuenta (aumenta la deuda temporalmente)
          const resInteres = await fetch('/api/gestion/cuentas-corrientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clienteId: cuenta.clienteId,
              tipo: 'ajuste',
              importe: formValues.montoInteres,
              descripcion: 'Interés/Recargo aplicado a pago parcial',
              notas: `Interés manual cobrado junto al pago. Forma de pago: ${formValues.formaPago}`
            })
          });
          
          if (!resInteres.ok) {
            throw new Error('No se pudo registrar el interés/recargo');
          }
        }

        // 2. Registrar el pago total (capital + interés). 
        // Al restar el total, la deuda neta bajará exactamente por el monto del capital.
        const totalPagar = formValues.montoCapital + formValues.montoInteres;

        const res = await fetch('/api/gestion/cuentas-corrientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: cuenta.clienteId,
            tipo: 'pago',
            importe: totalPagar,
            formaPago: formValues.formaPago,
            descripcion: descripcionPago,
            referencia: formValues.referencia || undefined,
            notas: formValues.notas || undefined
          })
        });

        if (res.ok) {
          const data = await res.json();
          const nuevoSaldo = data.saldoActual !== undefined ? data.saldoActual : Math.max(0, cuenta.deudaTotal - formValues.montoCapital);
          
          await Swal.fire({
            icon: 'success',
            title: '¡Pago Registrado!',
            html: `<div style="text-align: left; padding: 10px 0;">
              <p style="color: #d1d5db; margin-bottom: 8px;">Se registró un pago total de:</p>
              <div style="font-size: 24px; font-weight: bold; color: #10b981; margin-bottom: 12px;">${formatARS(totalPagar)}</div>
              <p style="color: #9ca3af; font-size: 13px; margin-bottom: 4px;">(Abono a capital: ${formatARS(formValues.montoCapital)} + Interés: ${formatARS(formValues.montoInteres)})</p>
              <p style="color: #d1d5db; margin-bottom: 4px;">Forma de pago: <strong style="color: white;">${FORMAS_PAGO.find(f => f.value === formValues.formaPago)?.label}</strong></p>
              <p style="color: #fbbf24; font-size: 14px; margin-top: 8px;">Saldo restante: <strong>${formatARS(nuevoSaldo)}</strong></p>
            </div>`,
            confirmButtonColor: '#10b981', background: '#1f2937', color: '#fff'
          });

          if (nuevoSaldo <= 0) {
            const { isConfirmed } = await Swal.fire({
              title: '¿Desea agregar una nueva deuda?',
              text: `La deuda de ${cuenta.razonSocial} ha sido saldada. ¿Desea registrar un nuevo cargo o ajuste ahora?`,
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Sí, agregar deuda',
              cancelButtonText: 'No, finalizar',
              confirmButtonColor: '#f59e0b',
              cancelButtonColor: '#6b7280',
              background: '#1f2937',
              color: '#fff'
            });

            if (isConfirmed) {
              await mostrarModalAgregarDeuda(cuenta.clienteId, cuenta.razonSocial);
            }
          }
          
          await fetchCuentas();
        } else {
          const err = await res.json();
          Swal.fire('Error', err.error || 'No se pudo registrar el pago', 'error');
        }
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Error de conexión con el servidor', 'error');
      } finally {
        setProcesandoPagoId(null);
      }
    }
  };

  const handleGenerarRecibo = async (cuenta: CuentaCorriente) => {
    if (procesandoPagoId === cuenta.clienteId) {
      Swal.fire({
        icon: 'warning',
        title: 'Procesando...',
        text: 'Ya hay una operación en curso para este cliente. Espera un momento.',
        confirmButtonColor: '#f59e0b',
        background: '#1f2937',
        color: '#fff'
      });
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: `Generar Recibo - ${cuenta.razonSocial}`,
      html: `
      <div style="text-align: left; padding: 10px 0;">
        <div style="margin-bottom: 15px; padding: 10px; background: #1f2937; border-radius: 8px; border: 1px solid #374151;">
          <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Deuda actual:</div>
          <div style="font-size: 20px; font-weight: bold; color: #f59e0b;">${formatARS(cuenta.deudaTotal)}</div>
        </div>
        
        <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Monto a abonar al capital (Principal) *</label>
        <input id="swal-monto-capital" type="number" step="0.01" min="0.01" max="${cuenta.deudaTotal}" value="${cuenta.deudaTotal}" 
          style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 8px;" />
        
        <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Interés / Recargo (en $, manual sin redondeo)</label>
        <input id="swal-interes" type="number" step="0.01" min="0" value="0" 
          style="width: 100%; padding: 8px 12px; background: #374151; color: #fbbf24; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" />

        <div style="margin-bottom: 15px; padding: 10px; background: #064e3b; border-radius: 8px; border: 1px solid #065f46;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 13px; color: #a7f3d0;">Total en Recibo:</span>
            <span id="swal-total-cobrar" style="font-size: 16px; font-weight: bold; color: #34d399;">${formatARS(cuenta.deudaTotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #065f46; padding-top: 4px; margin-top: 4px;">
            <span style="font-size: 12px; color: #6ee7b7;">Nueva deuda restante:</span>
            <span id="swal-nueva-deuda" style="font-size: 14px; font-weight: bold; color: #fbbf24;">${formatARS(0)}</span>
          </div>
        </div>

        <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Forma de pago *</label>
        <select id="swal-forma-pago" style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;">
          ${FORMAS_PAGO.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
        </select>
        <label style="display: block; font-size: 13px; color: #d1d5db; margin-bottom: 5px; font-weight: 500;">Concepto</label>
        <input id="swal-concepto" type="text" value="Pago de deuda"
          style="width: 100%; padding: 8px 12px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; margin-bottom: 12px;" />
      </div>`,
      didOpen: () => {
        const inputCapital = document.getElementById('swal-monto-capital') as HTMLInputElement;
        const inputInteres = document.getElementById('swal-interes') as HTMLInputElement;
        const spanTotal = document.getElementById('swal-total-cobrar');
        const spanNuevaDeuda = document.getElementById('swal-nueva-deuda');

        const actualizarTotales = () => {
          const capital = parseFloat(inputCapital.value) || 0;
          const interes = parseFloat(inputInteres.value) || 0;
          const total = capital + interes;
          const nuevaDeuda = Math.max(0, cuenta.deudaTotal - capital);

          if (spanTotal) spanTotal.textContent = formatARS(total);
          if (spanNuevaDeuda) spanNuevaDeuda.textContent = formatARS(nuevaDeuda);
        };

        (window as any).actualizarTotalesCC = actualizarTotales;

        inputCapital.addEventListener('input', actualizarTotales);
        inputInteres.addEventListener('input', actualizarTotales);
        actualizarTotales();
      },
      willClose: () => {
        delete (window as any).actualizarTotalesCC;
      },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Generar e Imprimir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      background: '#1f2937',
      color: '#fff',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const montoCapital = parseFloat((document.getElementById('swal-monto-capital') as HTMLInputElement).value);
        const montoInteres = parseFloat((document.getElementById('swal-interes') as HTMLInputElement).value) || 0;
        const formaPago = (document.getElementById('swal-forma-pago') as HTMLSelectElement).value;
        const concepto = (document.getElementById('swal-concepto') as HTMLInputElement).value;
        if (!montoCapital || montoCapital <= 0) { Swal.showValidationMessage('El monto al capital debe ser mayor a 0'); return false; }
        if (montoCapital > cuenta.deudaTotal) { Swal.showValidationMessage(`El monto al capital no puede superar la deuda (${formatARS(cuenta.deudaTotal)})`); return false; }
        return { montoCapital, montoInteres, formaPago, concepto };
      }
    });

    if (formValues) {
      setProcesandoPagoId(cuenta.clienteId);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setProcesandoPagoId(null);
        Swal.fire({
          icon: 'warning',
          title: 'Ventana de impresión bloqueada',
          html: 'Tu navegador bloqueó la ventana emergente.<br><br><strong>Solución:</strong> Haz clic en el ícono de "ventana bloqueada" y selecciona "Permitir siempre ventanas emergentes de este sitio".',
          background: '#1f2937',
          color: '#fff',
          confirmButtonColor: '#f59e0b'
        });
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Generando Recibo...</title>
            <style>
              body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #111827; color: white; }
              .loader { border: 4px solid #374151; border-top: 4px solid #f59e0b; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div style="text-align: center;">
              <div class="loader"></div>
              <h2>Generando recibo...</h2>
              <p style="color: #9ca3af;">Por favor no cierres esta ventana.</p>
            </div>
          </body>
        </html>
      `);

      try {
        let conceptoFinal = formValues.concepto;
        if (formValues.montoInteres > 0) {
          conceptoFinal += ` (Incluye ${formatARS(formValues.montoInteres)} de interés/recargo)`;
          
          // 1. Registrar el interés como ajuste
          const resInteres = await fetch('/api/gestion/cuentas-corrientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clienteId: cuenta.clienteId,
              tipo: 'ajuste',
              importe: formValues.montoInteres,
              descripcion: 'Interés/Recargo aplicado a pago parcial',
              notas: `Interés manual cobrado junto al pago. Forma de pago: ${formValues.formaPago}`
            })
          });
          
          if (!resInteres.ok) {
            throw new Error('No se pudo registrar el interés/recargo');
          }
        }

        const totalPagar = formValues.montoCapital + formValues.montoInteres;

        const resRecibo = await fetch('/api/gestion/pagos/recibo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: cuenta.clienteId,
            monto: totalPagar, // El recibo muestra el total cobrado (capital + interés)
            formaPago: formValues.formaPago,
            concepto: conceptoFinal,
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
            importe: totalPagar,
            formaPago: formValues.formaPago,
            descripcion: `Recibo #${String(recibo.numero).padStart(6, '0')} - ${conceptoFinal}`
          })
        });

        if (resCC.ok) {
          printWindow.location.href = `/gestion/pagos/recibo/${recibo._id}/imprimir`;
          
          const nuevoSaldo = Math.max(0, cuenta.deudaTotal - formValues.montoCapital);
          
          await Swal.fire({
            icon: 'success',
            title: '¡Recibo Generado!',
            html: `
              <div style="text-align: left;">
                <p style="margin-bottom: 8px;">Se generó el recibo <strong>#${String(recibo.numero).padStart(6, '0')}</strong> por:</p>
                <div style="font-size: 24px; font-weight: bold; color: #10b981; margin-bottom: 12px;">${formatARS(totalPagar)}</div>
                <p style="color: #9ca3af; font-size: 13px; margin-bottom: 4px;">(Abono a capital: ${formatARS(formValues.montoCapital)} + Interés: ${formatARS(formValues.montoInteres)})</p>
                <p style="color: #fbbf24; font-size: 14px; margin-bottom: 8px;">Nueva deuda restante: <strong>${formatARS(nuevoSaldo)}</strong></p>
                <p style="color: #9ca3af; font-size: 13px;">✅ La ventana de impresión se abrió automáticamente.</p>
              </div>
            `,
            confirmButtonColor: '#10b981',
            background: '#1f2937',
            color: '#fff'
          });

          if (nuevoSaldo <= 0) {
            const { isConfirmed } = await Swal.fire({
              title: '¿Desea agregar una nueva deuda?',
              text: `La deuda de ${cuenta.razonSocial} ha sido saldada. ¿Desea registrar un nuevo cargo o ajuste ahora?`,
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Sí, agregar deuda',
              cancelButtonText: 'No, finalizar',
              confirmButtonColor: '#f59e0b',
              cancelButtonColor: '#6b7280',
              background: '#1f2937',
              color: '#fff'
            });

            if (isConfirmed) {
              await mostrarModalAgregarDeuda(cuenta.clienteId, cuenta.razonSocial);
            }
          }

          await fetchCuentas();
        } else {
          throw new Error('No se pudo registrar el pago en la cuenta corriente');
        }
      } catch (err: any) {
        printWindow.close();
        Swal.fire('Error', err.message || 'Error de conexión', 'error');
      } finally {
        setProcesandoPagoId(null);
      }
    }
  };

  if (!isAuthorized) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8">
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
            <FaHistory /> Ver Historial
          </Link>
          <button onClick={fetchCuentas} disabled={loading} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50">
            <FaSync className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

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
              {buscando && <div className="absolute right-3 top-1/2 -translate-y-1/2"><FaSync className="animate-spin text-amber-400 text-sm" /></div>}
              {busquedaCliente.length >= 2 && !buscando && (
                <button onClick={() => { setBusquedaCliente(''); setResultadosBusqueda([]); setMostrarDropdown(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
          {mostrarDropdown && resultadosBusqueda.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
              {resultadosBusqueda.map((cliente) => (
                <button key={cliente._id} onClick={() => handleAgregarDeudaRapida(cliente)} className="w-full text-left px-4 py-3 hover:bg-gray-800 border-b border-gray-800 last:border-0 transition-colors flex justify-between items-center group">
                  <div>
                    <div className="font-medium text-white group-hover:text-amber-400 transition-colors">{cliente.razonSocial}</div>
                    {(cliente.nombre || cliente.apellido) && <div className="text-xs text-gray-400">{cliente.nombre} {cliente.apellido}</div>}
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

      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <FaSearch className="text-gray-400 text-lg" />
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar en la lista por nombre, razón social o teléfono..."
          value={filtroLista}
          onChange={(e) => setFiltroLista(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white pl-12 pr-12 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder-gray-500 shadow-sm"
        />
        {filtroLista && (
          <button 
            onClick={() => setFiltroLista('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
            title="Limpiar búsqueda"
          >
            <FaTimes className="text-lg" />
          </button>
        )}
        {filtroLista && (
          <div className="absolute right-14 top-1/2 -translate-y-1/2 text-xs text-amber-400 font-medium bg-amber-900/30 px-2 py-1 rounded border border-amber-700/50">
            {cuentasFiltradas.length} resultado{cuentasFiltradas.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-300 flex flex-col items-center gap-3">
            <FaSync className="animate-spin text-amber-400 text-2xl" />
            Cargando cuentas corrientes...
          </div>
        ) : cuentasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-3">
            <FaSearch className="text-4xl text-gray-600" />
            {filtroLista ? 'No se encontraron clientes que coincidan con tu búsqueda.' : 'No hay clientes con saldo pendiente.'}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-700">
              {cuentasPaginadas.map((cuenta) => (
                <div key={cuenta.clienteId} className="p-4 hover:bg-gray-750 transition-colors">
                  <div className="flex flex-col md:flex-row md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FaUser className="text-amber-400 text-sm" />
                        <span className="font-medium text-white text-lg">{cuenta.razonSocial}</span>
                        {cuenta.tieneAlerta && (
                          <span className="px-2 py-0.5 text-xs bg-red-600 text-white rounded-full flex items-center gap-1 animate-pulse">
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

                      {cuenta.ultimosMovimientos && cuenta.ultimosMovimientos.length > 0 && (
                        <div className="mt-3 ml-5">
                          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                            <FaHistory className="text-amber-400" /> Últimos 5 Movimientos
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-gray-700">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-gray-900/80 text-gray-400">
                                <tr>
                                  <th className="px-3 py-2">Fecha</th>
                                  <th className="px-3 py-2">Tipo</th>
                                  <th className="px-3 py-2">Descripción</th>
                                  <th className="px-3 py-2 text-right">Importe</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700 bg-gray-900/30">
                                {cuenta.ultimosMovimientos.map((mov, idx) => (
                                  <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                                    <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{mov.fecha}</td>
                                    <td className="px-3 py-2">
                                      <span className={`font-semibold capitalize flex items-center gap-1 ${
                                        mov.tipo === 'pago' ? 'text-green-400' : 
                                        mov.tipo === 'ajuste' ? 'text-amber-400' : 'text-blue-400'
                                      }`}>
                                        {mov.tipo === 'pago' ? '💰 Pago' : 
                                         mov.tipo === 'ajuste' ? '⚠️ Ajuste' : '📦 Pedido'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-300 max-w-[150px] truncate" title={mov.descripcion}>
                                      {mov.descripcion}
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold text-white whitespace-nowrap">
                                      {formatARS(mov.importe)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Saldo Pendiente</div>
                        <div className="text-2xl font-bold text-amber-400">{formatARS(cuenta.deudaTotal)}</div>
                      </div>
                      
                      <button
                        onClick={() => handleRegistrarPago(cuenta)}
                        disabled={procesandoPagoId === cuenta.clienteId}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                          procesandoPagoId === cuenta.clienteId
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {procesandoPagoId === cuenta.clienteId ? (
                          <>
                            <FaSync className="animate-spin" /> Procesando...
                          </>
                        ) : (
                          <>
                            <FaMoneyBillWave /> Registrar Pago
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleGenerarRecibo(cuenta)}
                        disabled={procesandoPagoId === cuenta.clienteId}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                          procesandoPagoId === cuenta.clienteId
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        title="Generar recibo de pago para imprimir"
                      >
                        {procesandoPagoId === cuenta.clienteId ? (
                          <>
                            <FaSync className="animate-spin" /> Procesando...
                          </>
                        ) : (
                          <>
                            <FaPrint /> Generar Recibo
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPaginas > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-gray-900/50 border-t border-gray-700">
                <div className="text-sm text-gray-400 mb-3 sm:mb-0">
                  Mostrando <span className="font-medium text-white">{(paginaActual - 1) * itemsPorPagina + 1}</span> a{' '}
                  <span className="font-medium text-white">{Math.min(paginaActual * itemsPorPagina, cuentasFiltradas.length)}</span> de{' '}
                  <span className="font-medium text-white">{cuentasFiltradas.length}</span> resultados
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                    className="px-4 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-600 transition flex items-center gap-2 text-sm font-medium"
                  >
                    <FaChevronLeft size={12} /> Anterior
                  </button>
                  
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPaginas > 5 && paginaActual > 3) {
                        pageNum = paginaActual - 2 + i;
                      }
                      if (pageNum > totalPaginas) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPaginaActual(pageNum)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                            paginaActual === pageNum 
                              ? 'bg-amber-600 text-white' 
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaActual === totalPaginas}
                    className="px-4 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-600 transition flex items-center gap-2 text-sm font-medium"
                  >
                    Siguiente <FaChevronRight size={12} />
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