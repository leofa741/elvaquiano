// app/api/gestion/presupuestos/online/route.ts
import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';
import Presupuesto from '@/app/models/Presupuesto';
import { NextResponse } from 'next/server';
import Producto from '@/app/models/Product';
import { notifyProducts } from '@/app/api/gestion/productos/events/productsNotifier';

// 🔧 Funciones de normalización (coinciden con el modelo)
const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const normalizeTelefono = (text: string): string => {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9+]/g, '');
};

async function reservarStockOnline(productos: any[]) {
  for (const item of productos) {
    const producto = await Producto.findById(item.producto);
    if (!producto) continue;

    producto.stockReservado = (producto.stockReservado || 0) + item.cantidad;
    await producto.save();

    notifyProducts({
      type: 'stock_reservado',
      data: producto,
    });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const DEPOSITO_DEFAULT = 'san vicente';

    const body = await req.json();
    const { cliente: clienteInput, cart } = body;

    // ✅ VALIDACIÓN ACTUALIZADA
    if (!clienteInput?.nombre || !clienteInput?.direccion || !clienteInput?.telefono || !cart?.length) {
      return NextResponse.json({ error: 'Datos incompletos: nombre, dirección y teléfono son obligatorios' }, { status: 400 });
    }

    // 🔧 Normalizar y procesar datos
    const nombreCompleto = clienteInput.nombre.trim();
    const direccionOriginal = clienteInput.direccion.trim();
    const telefonoOriginal = clienteInput.telefono.trim();
    const telefonoNormalized = normalizeTelefono(telefonoOriginal);

    // 🔧 Separar nombre y apellido (simple: por primer espacio)
    const [primerNombre, ...restoApellido] = nombreCompleto.split(' ');
    const apellido = restoApellido.join(' ') || 'Online';

    // 🔧 Usar nombreCompleto como razónSocial (cumple required+unique del modelo)
    const razonSocialOriginal = nombreCompleto;
    const razonSocialNormalized = normalizeText(razonSocialOriginal);

    // 🔍 Buscar cliente por teléfono normalizado (más confiable para online)
    let cliente = await Cliente.findOne({ telefonoNormalized });

    // ➕ Crear cliente si no existe
    if (!cliente) {
      try {
        cliente = await Cliente.create({
          razonSocial: razonSocialOriginal,
          razonSocialNormalized,
          nombre: primerNombre,
          apellido,
          telefono: telefonoOriginal,
          telefonoNormalized,
          direccion: direccionOriginal,
          activo: true,
          origen: 'online',
        });
      } catch (error: any) {
        // Race condition: si falla por duplicado, buscar nuevamente
        if (error.code === 11000 || error.name === 'MongoServerError') {
          cliente = await Cliente.findOne({ telefonoNormalized });
          if (!cliente) {
            return NextResponse.json(
              { error: 'Error al crear cliente. Intente nuevamente.' },
              { status: 409 }
            );
          }
        } else {
          throw error;
        }
      }
    } else {
      // 🔄 Actualizar datos si cambiaron
      let needsUpdate = false;
      
      if (cliente.razonSocial !== razonSocialOriginal) {
        cliente.razonSocial = razonSocialOriginal;
        needsUpdate = true;
      }
      if (cliente.nombre !== primerNombre) {
        cliente.nombre = primerNombre;
        needsUpdate = true;
      }
      if (cliente.apellido !== apellido) {
        cliente.apellido = apellido;
        needsUpdate = true;
      }
      if (cliente.direccion !== direccionOriginal) {
        cliente.direccion = direccionOriginal;
        needsUpdate = true;
      }
      if (cliente.telefono !== telefonoOriginal) {
        cliente.telefono = telefonoOriginal;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await cliente.save();
      }
    }

    // 📦 Procesar productos del carrito
    const productos = cart.map((p: any) => {
      const precioAplicado =
        p.precioOferta && p.precioOferta < p.precioMayorista
          ? p.precioOferta
          : p.precioMayorista;

      return {
        producto: p._id,
        nombre: p.nombre,
        unidad: p.unidad,
        cantidad: p.qty,
        unidadesFisicas: p.qty,
        tipoPrecio: precioAplicado === p.precioMayorista ? 'mayorista' : 'oferta',
        precioAplicado,
        subtotal: precioAplicado * p.qty,
        deposito: DEPOSITO_DEFAULT,
      };
    });

    const total = productos.reduce((acc: number, p: any) => acc + p.subtotal, 0);

    // 🧾 Crear presupuesto
    const presupuesto = await Presupuesto.create({
      cliente: cliente._id,
      productos,
      total,
      estado: 'borrador',
      origen: 'online',
    });

    // ✅ Reservar stock
    await reservarStockOnline(productos);

    return NextResponse.json({
      _id: presupuesto._id,
      total,
    });

  } catch (error: any) {
    console.error('Error en presupuesto online:', error);
    
    if (error.code === 11000 || error.name === 'MongoServerError') {
      return NextResponse.json(
        { error: 'Ya existe un cliente con este teléfono o razón social' },
        { status: 409 }
      );
    }
    
    if (error.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}