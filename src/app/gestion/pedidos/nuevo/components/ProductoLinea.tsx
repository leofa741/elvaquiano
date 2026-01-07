// app/gestion/pedidos/nuevo/components/ProductoLinea.tsx
'use client';

import { FaStore, FaUserFriends } from 'react-icons/fa';
import { formatARS } from '@/app/lib/formatcurrenci';

interface ProductoOption {
  _id: string;
  nombre: string;
  unidad: string;
  precioOferta: number;
  precioMayorista: number;
  stock: Array<{ deposito: string; cantidad: number }>;
}

interface ProductoLineaProps {
  producto: ProductoOption;
  deposito: string;
  cantidad: number;
  tipoPrecio: 'mayorista' | 'oferta';
  onRemove: () => void;
  onChange: (field: 'deposito' | 'cantidad' | 'tipoPrecio', value: string | number) => void;
}

export default function ProductoLinea({
  producto,
  deposito,
  cantidad,
  tipoPrecio,
  onRemove,
  onChange
}: ProductoLineaProps) {
  const precioAplicado = tipoPrecio === 'oferta'
    ? producto.precioOferta
    : producto.precioMayorista;
  const subtotal = cantidad * precioAplicado;

  return (
    <div className="bg-gray-750 p-4 rounded-lg border border-gray-600">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium text-white">{producto.nombre}</div>
          <div className="text-sm text-gray-300">{producto.unidad}</div>

          <div className="mt-3">
            <label className="text-xs text-gray-400">Depósito</label>
            <select
              value={deposito}
              onChange={(e) => onChange('deposito', e.target.value)}
              className="w-full mt-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              {producto.stock.map((s, idx) => (
                <option key={idx} value={s.deposito}>
                  {s.deposito} ({s.cantidad} disp.)
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Cantidad</label>
              <input
                type="text"
                inputMode="decimal" // ✅ abre teclado numérico en móviles
                value={cantidad}
                onChange={(e) => {
                  const value = e.target.value;
                  // Solo permitir números y un punto opcional (aunque en cantidades enteras, no lo necesitas)
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    const num = parseFloat(value);
                    onChange('cantidad', isNaN(num) ? 0 : num);
                  }
                }}
                onBlur={(e) => {
                  // Asegurar que no quede vacío
                  if (e.target.value === '') {
                    onChange('cantidad', 0);
                  }
                }}
                className="w-full mt-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Subtotal</label>
              <div className="mt-1 px-2 py-1.5 bg-gray-700 rounded text-white text-sm font-medium">
                ${formatARS(subtotal)}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs text-gray-400">Precio a aplicar</label>
            <div className="flex mt-1 gap-2">
              <button
                type="button"
                onClick={() => onChange('tipoPrecio', 'oferta')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-sm rounded transition ${tipoPrecio === 'oferta'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                <FaUserFriends className="text-xs" />
                Oferta  ($ {formatARS(producto.precioOferta)} )
              </button>
              <button
                type="button"
                onClick={() => onChange('tipoPrecio', 'mayorista')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-sm rounded transition ${tipoPrecio === 'mayorista'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                <FaStore className="text-xs" />
                Mayorista  ($ {formatARS(producto.precioMayorista)} )
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onRemove}
          className="ml-3 text-red-400 hover:text-red-300 text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}