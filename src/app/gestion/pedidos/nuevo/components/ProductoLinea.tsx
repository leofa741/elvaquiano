'use client';

import { useState, useEffect } from 'react';
import { FaStore, FaUserFriends, FaWeightHanging, FaMinus, FaPlus, FaCalculator } from 'react-icons/fa';
import { formatARS } from '@/app/lib/formatcurrenci';

// ✅ Helpers para formato inteligente
const formatCantidad = (cantidad: number, unidad: string): string => {
  if (unidad === 'kg' || unidad === 'litro') {
    return cantidad.toFixed(3).replace('.', ',');
  }
  return Math.round(cantidad).toString();
};

const getUnidadTexto = (unidad: string): string => {
  if (unidad === 'kg') return 'kg';
  if (unidad === 'litro') return 'litros';
  if (unidad === 'unidad') return 'unidades';
  return unidad;
};

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
  // ✅ Estado local para permitir escritura libre sin interrupciones
  const [cantidadInput, setCantidadInput] = useState<string>(formatCantidad(cantidad, producto.unidad));
  const [isFocused, setIsFocused] = useState(false);
  
  // ✅ Sincronizar solo si NO está enfocado (evita sobrescribir mientras el usuario escribe)
  useEffect(() => {
    if (!isFocused) {
      setCantidadInput(formatCantidad(cantidad, producto.unidad));
    }
  }, [cantidad, producto.unidad, isFocused]);

  const precioUnitario = tipoPrecio === 'oferta' 
    ? producto.precioOferta 
    : producto.precioMayorista;
  
  const subtotal = parseFloat((cantidad * precioUnitario).toFixed(2));
  const increment = producto.unidad === 'kg' || producto.unidad === 'litro' ? 0.1 : 1;

  // ✅ Manejar cambio en input: permite escribir libremente "1,", "1,5", etc.
  const handleCantidadChange = (value: string) => {
    // Limpiar: solo permite números y una coma
    let cleanValue = value.replace(/[^0-9,]/g, '');
    const parts = cleanValue.split(',');
    if (parts.length > 2) {
      cleanValue = parts[0] + ',' + parts.slice(1).join('');
    }
    
    setCantidadInput(cleanValue);
    
    // Actualizar el padre solo si es un número válido
    const valorNumerico = parseFloat(cleanValue.replace(',', '.'));
    if (!isNaN(valorNumerico) && valorNumerico >= 0.001) {
      onChange('cantidad', parseFloat(valorNumerico.toFixed(3)));
    }
  };

  // ✅ Normalizar al perder el foco (aquí sí agrega los ceros finales si es necesario)
  const handleBlur = () => {
    setIsFocused(false);
    const valorNumerico = parseFloat(cantidadInput.replace(',', '.'));
    
    if (isNaN(valorNumerico) || valorNumerico < 0.001) {
      const valorCorregido = 0.001;
      setCantidadInput(formatCantidad(valorCorregido, producto.unidad));
      onChange('cantidad', valorCorregido);
    } else {
      const valorCorregido = parseFloat(valorNumerico.toFixed(3));
      setCantidadInput(formatCantidad(valorCorregido, producto.unidad));
      onChange('cantidad', valorCorregido);
    }
  };

  // ✅ Botones +/-
  const ajustarCantidad = (delta: number) => {
    const nuevaCantidad = parseFloat(Math.max(0.001, cantidad + delta).toFixed(3));
    onChange('cantidad', nuevaCantidad);
    setCantidadInput(formatCantidad(nuevaCantidad, producto.unidad));
  };

  return (
    <div className="bg-gray-750 p-4 rounded-lg border border-gray-600">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium text-white flex items-center gap-2">
            {producto.nombre}
            {(producto.unidad === 'kg' || producto.unidad === 'litro') && (
              <FaWeightHanging className="text-amber-400 text-xs" title="Producto por peso" />
            )}
          </div>
          <div className="text-sm text-gray-300">
            {getUnidadTexto(producto.unidad)}
          </div>

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
              <label className="text-xs text-gray-400 flex items-center gap-1">
                Cantidad ({producto.unidad})
              </label>
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => ajustarCantidad(-increment)}
                  className="w-8 h-8 rounded bg-gray-600 text-white flex items-center justify-center hover:bg-gray-500 transition text-sm"
                  title={producto.unidad === 'kg' ? 'Restar 100g' : 'Restar 1 unidad'}
                >
                  <FaMinus size={12} />
                </button>
                
                <input
                  type="text"
                  inputMode="decimal"
                  value={cantidadInput}
                  onChange={(e) => handleCantidadChange(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={handleBlur}
                  className="flex-1 text-center bg-gray-700 border border-gray-600 rounded text-white text-sm py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder={producto.unidad === 'kg' ? "0,000" : "1"}
                />
                
                <button
                  type="button"
                  onClick={() => ajustarCantidad(increment)}
                  className="w-8 h-8 rounded bg-gray-600 text-white flex items-center justify-center hover:bg-gray-500 transition text-sm"
                  title={producto.unidad === 'kg' ? 'Sumar 100g' : 'Sumar 1 unidad'}
                >
                  <FaPlus size={12} />
                </button>
              </div>
              
              {producto.unidad === 'kg' && (
                <p className="text-[10px] text-gray-500 mt-1 italic">
                  Ej: 1,300 = 1 kg 300g
                </p>
              )}
            </div>
            
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <FaCalculator className="text-green-400" /> Subtotal
              </label>
              <div className="mt-1 px-2 py-1.5 bg-green-900/30 border border-green-700/50 rounded text-green-300 text-sm font-bold text-right">
                {formatARS(subtotal)}
              </div>
              <p className="text-[10px] text-gray-500 mt-1 text-right">
                {formatCantidad(cantidad, producto.unidad)} × {formatARS(precioUnitario)}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs text-gray-400">Precio unitario a aplicar</label>
            <div className="flex mt-1 gap-2">
              <button
                type="button"
                onClick={() => onChange('tipoPrecio', 'oferta')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-sm rounded transition ${
                  tipoPrecio === 'oferta'
                    ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <FaUserFriends className="text-xs" />
                <div className="flex flex-col items-center">
                  <span>Oferta</span>
                  <span className="text-[10px] opacity-80">{formatARS(producto.precioOferta)}/u</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onChange('tipoPrecio', 'mayorista')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-sm rounded transition ${
                  tipoPrecio === 'mayorista'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <FaStore className="text-xs" />
                <div className="flex flex-col items-center">
                  <span>Mayorista</span>
                  <span className="text-[10px] opacity-80">{formatARS(producto.precioMayorista)}/u</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onRemove}
          className="ml-3 text-red-400 hover:text-red-300 text-xl font-bold"
          title="Eliminar producto"
        >
          ×
        </button>
      </div>
    </div>
  );
}