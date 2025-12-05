'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { FaUser, FaBuilding, FaPhone, FaEnvelope, FaMapMarkerAlt, FaIdCard, FaCreditCard } from 'react-icons/fa';

interface Cliente {
  _id: string;
  razonSocial: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  telefono: string;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  formaPago: 'efectivo' | 'transferencia' | 'qr' | 'tarjeta' | 'cuenta_corriente' | 'otro';
  activo: boolean;
}

interface ClienteForm {
  razonSocial: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  formaPago: 'efectivo' | 'transferencia' | 'qr' | 'tarjeta' | 'cuenta_corriente' | 'otro';
}

export default function EditarClientePage() {
  const isAuthorized = useAdminAuthorization();
  const { id } = useParams() as { id?: string };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClienteForm>({
    razonSocial: '',
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    formaPago: 'efectivo',
  });

  // Cargar cliente
  useEffect(() => {
    if (!isAuthorized || !id) return;

    const fetchCliente = async () => {
      try {
        const res = await fetch(`/api/gestion/clientes/${id}`);
        if (!res.ok) {
          toast.error('Cliente no encontrado');
          router.push('/gestion/clientes');
          return;
        }
        const cliente: Cliente = await res.json();
        setForm({
          razonSocial: cliente.razonSocial,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          dni: cliente.dni || '',
          telefono: cliente.telefono,
          email: cliente.email || '',
          direccion: cliente.direccion || '',
          ciudad: cliente.ciudad || '',
          provincia: cliente.provincia || '',
          formaPago: cliente.formaPago,
        });
      } catch (err) {
        toast.error('Error al cargar el cliente');
        router.push('/gestion/clientes');
      } finally {
        setLoading(false);
      }
    };

    fetchCliente();
  }, [isAuthorized, id, router]);

  if (!isAuthorized) return null;
  if (loading) return <div className="p-8 text-center text-gray-400">Cargando cliente...</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!form.razonSocial.trim()) {
      toast.error('La razón social es obligatoria.');
      return false;
    }
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio.');
      return false;
    }
    if (!form.apellido.trim()) {
      toast.error('El apellido es obligatorio.');
      return false;
    }
    if (!form.telefono.trim()) {
      toast.error('El teléfono es obligatorio.');
      return false;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('El correo electrónico no es válido.');
      return false;
    }
    if (form.dni && !/^\d{7,8}$/.test(form.dni.replace(/\D/g, ''))) {
      toast.error('El DNI debe tener 7 u 8 dígitos.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !id) return;

    setSaving(true);

    try {
      const clienteData = {
        razonSocial: form.razonSocial.trim(),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni: form.dni.trim() || null,
        telefono: form.telefono.trim(),
        email: form.email.trim() || null,
        direccion: form.direccion.trim() || null,
        ciudad: form.ciudad.trim() || null,
        provincia: form.provincia.trim() || null,
        formaPago: form.formaPago,
      };

      const res = await fetch(`/api/gestion/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteData),
      });

      if (res.ok) {
        toast.success('✅ Cliente actualizado con éxito');
        router.push('/gestion/clientes');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al actualizar el cliente');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error de conexión con el servidor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/gestion/clientes" className="text-amber-500 hover:text-amber-400 flex items-center gap-1">
          ← Volver a clientes
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Editar Cliente</h1>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Razón Social */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FaBuilding className="text-amber-400" />
              Razón Social *
            </label>
            <input
              type="text"
              name="razonSocial"
              value={form.razonSocial}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          {/* Nombre y Apellido */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <FaUser className="text-amber-400" />
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <FaUser className="text-amber-400" />
                Apellido *
              </label>
              <input
                type="text"
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* DNI y Teléfono */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <FaIdCard className="text-amber-400" />
                DNI (opcional)
              </label>
              <input
                type="text"
                name="dni"
                value={form.dni}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="22222222"
              />
              <p className="text-xs text-gray-400 mt-1">7 u 8 dígitos, sin puntos</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <FaPhone className="text-amber-400" />
                Teléfono *
              </label>
              <input
                type="text"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FaEnvelope className="text-amber-400" />
              Email (opcional)
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="contacto@ejemplo.com"
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FaMapMarkerAlt className="text-amber-400" />
              Dirección (opcional)
            </label>
            <input
              type="text"
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Calle Falsa 123, Piso 2"
            />
          </div>

          {/* Ciudad y Provincia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ciudad (opcional)
              </label>
              <input
                type="text"
                name="ciudad"
                value={form.ciudad}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Buenos Aires"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Provincia (opcional)
              </label>
              <input
                type="text"
                name="provincia"
                value={form.provincia}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="CABA"
              />
            </div>
          </div>

          {/* Forma de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FaCreditCard className="text-amber-400" />
              Forma de Pago Preferida
            </label>
            <select
              name="formaPago"
              value={form.formaPago}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia Bancaria</option>
              <option value="qr">QR / Link de Pago</option>
              <option value="tarjeta">Tarjeta de Crédito/Débito</option>
              <option value="cuenta_corriente">Cuenta Corriente</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-3 rounded-lg transition disabled:opacity-70 shadow"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
            <Link
              href="/gestion/clientes"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg text-center transition"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}