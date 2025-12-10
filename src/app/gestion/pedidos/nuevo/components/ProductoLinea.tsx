// app/gestion/pedidos/nuevo/components/ProductoLinea.tsx
'use client';

import { FaStore, FaUserFriends } from 'react-icons/fa';

interface ProductoOption {
  _id: string;
  nombre: string;
  unidad: string;
  precioMinorista: number;
  precioMayorista: number;
  stock: Array<{ deposito: string; cantidad: number }>;
}

interface ProductoLineaProps {
  producto: ProductoOption;
  deposito: string;
  cantidad: number;
  tipoPrecio: 'minorista' | 'mayorista';
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
  const precioAplicado = tipoPrecio === 'minorista'
    ? producto.precioMinorista
    : producto.precioMayorista;
  const subtotal = Number((cantidad * precioAplicado).toFixed(2));

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
                type="number"
                min="0.001"
                step="0.001"
                value={cantidad === 0 ? "" : cantidad}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange("cantidad", v === "" ? 0 : parseFloat(v));
                }}
                className="w-full mt-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />

            </div>
            <div>
              <label className="text-xs text-gray-400">Subtotal</label>
              <div className="mt-1 px-2 py-1.5 bg-gray-700 rounded text-white text-sm font-medium">
                ${subtotal.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs text-gray-400">Precio a aplicar</label>
            <div className="flex mt-1 gap-2">
              <button
                type="button"
                onClick={() => onChange('tipoPrecio', 'minorista')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-sm rounded transition ${tipoPrecio === 'minorista'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                <FaUserFriends className="text-xs" />
                Minorista (${producto.precioMinorista.toFixed(2)})
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
                Mayorista (${producto.precioMayorista.toFixed(2)})
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