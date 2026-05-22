// src/app/gestion/clientes/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuthorization } from '@/app/hooks/useAdminAuthorization';
import { toast } from 'react-toastify';
import Link from 'next/link';

import {
  FaUser,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaIdCard,
  FaCreditCard,
  FaExclamationCircle,
} from 'react-icons/fa';

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
  formaPago:
    | 'efectivo'
    | 'transferencia'
    | 'qr'
    | 'tarjeta'
    | 'cuenta_corriente'
    | 'otro';
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
  formaPago:
    | 'efectivo'
    | 'transferencia'
    | 'qr'
    | 'tarjeta'
    | 'cuenta_corriente'
    | 'otro';
}

interface FormErrors {
  razonSocial?: string;
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  email?: string;
}

export default function EditarClientePage() {
  const isAuthorized = useAdminAuthorization();

  const { id } = useParams() as {
    id?: string;
  };

  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] =
    useState<ClienteForm>({
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

  const [errors, setErrors] =
    useState<FormErrors>({});

  // cargar cliente
  useEffect(() => {
    if (!isAuthorized || !id) return;

    const fetchCliente = async () => {
      try {
        const res = await fetch(
          `/api/gestion/clientes/${id}`
        );

        if (!res.ok) {
          toast.error(
            'Cliente no encontrado'
          );

          router.push(
            '/gestion/clientes'
          );

          return;
        }

        const cliente: Cliente =
          await res.json();

        setForm({
          razonSocial:
            cliente.razonSocial || '',
          nombre: cliente.nombre || '',
          apellido:
            cliente.apellido || '',
          dni: cliente.dni || '',
          telefono:
            cliente.telefono || '',
          email: cliente.email || '',
          direccion:
            cliente.direccion || '',
          ciudad: cliente.ciudad || '',
          provincia:
            cliente.provincia || '',
          formaPago:
            cliente.formaPago ||
            'efectivo',
        });
      } catch {
        toast.error(
          'Error al cargar cliente'
        );

        router.push(
          '/gestion/clientes'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCliente();
  }, [isAuthorized, id, router]);

  if (!isAuthorized) return null;

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        Cargando cliente...
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    // limpiar error al escribir
    if (
      errors[name as keyof FormErrors]
    ) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // VALIDACIÓN COMPLETA
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // razón social
    if (
      !form.razonSocial.trim()
    ) {
      newErrors.razonSocial =
        'Debe ingresar la razón social';
    }

    // nombre
    if (!form.nombre.trim()) {
      newErrors.nombre =
        'Debe ingresar el nombre';
    }

    // apellido
    if (!form.apellido.trim()) {
      newErrors.apellido =
        'Debe ingresar el apellido';
    }

    // dni obligatorio
    if (!form.dni.trim()) {
      newErrors.dni =
        'Debe ingresar el DNI';
    } else if (
      !/^\d{7,8}$/.test(
        form.dni.replace(/\D/g, '')
      )
    ) {
      newErrors.dni =
        'El DNI debe tener 7 u 8 números';
    }

    // teléfono
    if (
      !form.telefono.trim()
    ) {
      newErrors.telefono =
        'Debe ingresar el teléfono';
    }

    // email obligatorio
    if (!form.email.trim()) {
      newErrors.email =
        'Debe ingresar el email';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email
      )
    ) {
      newErrors.email =
        'El email no es válido';
    }

    setErrors(newErrors);

    // mostrar toast general
    if (
      Object.keys(newErrors).length > 0
    ) {
      toast.error(
        '⚠️ Completá todos los campos obligatorios',
        {
          autoClose: 4000,
        }
      );

      return false;
    }

    return true;
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setErrors({});

    if (
      !validateForm() ||
      !id
    ) {
      return;
    }

    setSaving(true);

    try {
      const clienteData = {
        razonSocial:
          form.razonSocial.trim(),

        nombre: form.nombre.trim(),

        apellido:
          form.apellido.trim(),

        dni: form.dni.trim(),

        telefono:
          form.telefono.trim(),

        email: form.email.trim(),

        direccion:
          form.direccion.trim() ||
          null,

        ciudad:
          form.ciudad.trim() ||
          null,

        provincia:
          form.provincia.trim() ||
          null,

        formaPago:
          form.formaPago,
      };

      const res = await fetch(
        `/api/gestion/clientes/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(
            clienteData
          ),
        }
      );

      if (res.ok) {
        toast.success(
          '✅ Cliente actualizado'
        );

        router.push(
          '/gestion/clientes'
        );
      } else {
        const error =
          await res.json();

        if (
          error.field
        ) {
          setErrors((prev) => ({
            ...prev,
            [error.field]:
              error.message,
          }));

          toast.error(
            error.message
          );
        } else {
          toast.error(
            error.error ||
              'Error al guardar'
          );
        }
      }
    } catch {
      toast.error(
        'Error de conexión'
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (
    fieldName: keyof FormErrors
  ) =>
    `w-full px-4 py-3 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 transition ${
      errors[fieldName]
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-600 focus:ring-amber-500 hover:border-gray-500'
    }`;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/gestion/clientes"
          className="text-amber-500 hover:text-amber-400"
        >
          ← Volver
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Editar Cliente
        </h1>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-3xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* ALERTA GENERAL */}
          {Object.keys(errors)
            .length > 0 && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex gap-3">
              <FaExclamationCircle className="text-red-400 mt-1" />

              <div className="text-red-200 text-sm">
                <p className="font-semibold mb-2">
                  Revisá los siguientes campos:
                </p>

                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(
                    errors
                  ).map(
                    ([
                      field,
                      message,
                    ]) => (
                      <li
                        key={field}
                      >
                        <strong>
                          {field}
                        </strong>
                        : {message}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* razón social */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FaBuilding className="text-amber-400" />

              Razón Social{' '}
              <span className="text-red-400">
                *
              </span>
            </label>

            <input
              type="text"
              name="razonSocial"
              value={
                form.razonSocial
              }
              onChange={
                handleChange
              }
              className={inputClass(
                'razonSocial'
              )}
            />

            {errors.razonSocial && (
              <p className="text-xs text-red-400 mt-1">
                {
                  errors.razonSocial
                }
              </p>
            )}
          </div>

          {/* nombre apellido */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre{' '}
                <span className="text-red-400">
                  *
                </span>
              </label>

              <input
                type="text"
                name="nombre"
                value={
                  form.nombre
                }
                onChange={
                  handleChange
                }
                className={inputClass(
                  'nombre'
                )}
              />

              {errors.nombre && (
                <p className="text-xs text-red-400 mt-1">
                  {
                    errors.nombre
                  }
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Apellido{' '}
                <span className="text-red-400">
                  *
                </span>
              </label>

              <input
                type="text"
                name="apellido"
                value={
                  form.apellido
                }
                onChange={
                  handleChange
                }
                className={inputClass(
                  'apellido'
                )}
              />

              {errors.apellido && (
                <p className="text-xs text-red-400 mt-1">
                  {
                    errors.apellido
                  }
                </p>
              )}
            </div>
          </div>

          {/* dni telefono */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                DNI{' '}
                <span className="text-red-400">
                  *
                </span>
              </label>

              <input
                type="text"
                name="dni"
                value={form.dni}
                onChange={
                  handleChange
                }
                className={inputClass(
                  'dni'
                )}
                placeholder="22111222"
              />

              {errors.dni && (
                <p className="text-xs text-red-400 mt-1">
                  {errors.dni}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Teléfono{' '}
                <span className="text-red-400">
                  *
                </span>
              </label>

              <input
                type="text"
                name="telefono"
                value={
                  form.telefono
                }
                onChange={
                  handleChange
                }
                className={inputClass(
                  'telefono'
                )}
              />

              {errors.telefono && (
                <p className="text-xs text-red-400 mt-1">
                  {
                    errors.telefono
                  }
                </p>
              )}
            </div>
          </div>

          {/* email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email{' '}
              <span className="text-red-400">
                *
              </span>
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={
                handleChange
              }
              className={inputClass(
                'email'
              )}
            />

            {errors.email && (
              <p className="text-xs text-red-400 mt-1">
                {errors.email}
              </p>
            )}
          </div>

          {/* dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dirección
            </label>

            <input
              type="text"
              name="direccion"
              value={
                form.direccion
              }
              onChange={
                handleChange
              }
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* ciudad provincia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input
              type="text"
              name="ciudad"
              value={form.ciudad}
              onChange={
                handleChange
              }
              placeholder="Ciudad"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />

            <input
              type="text"
              name="provincia"
              value={
                form.provincia
              }
              onChange={
                handleChange
              }
              placeholder="Provincia"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* forma pago */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Forma de pago
            </label>

            <select
              name="formaPago"
              value={
                form.formaPago
              }
              onChange={
                handleChange
              }
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="efectivo">
                Efectivo
              </option>

              <option value="transferencia">
                Transferencia
              </option>

              <option value="qr">
                QR
              </option>

              <option value="tarjeta">
                Tarjeta
              </option>

              <option value="cuenta_corriente">
                Cuenta corriente
              </option>

              <option value="otro">
                Otro
              </option>
            </select>
          </div>

          {/* botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg"
            >
              {saving
                ? 'Guardando...'
                : '💾 Guardar Cambios'}
            </button>

            <Link
              href="/gestion/clientes"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg text-center"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}