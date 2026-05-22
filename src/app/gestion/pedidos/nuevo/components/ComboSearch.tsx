'use client';

import {
  useState,
  useRef,
  useEffect,
  ReactNode,
} from 'react';

type Item = {
  _id: string;
  razonSocial?: string;
  nombre?: string;
  apellido?: string;
  [key: string]: any;
};

type ComboSearchProps = {
  items?: Item[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  icon?: ReactNode;
  required?: boolean;
};

export default function ComboSearch({
  items = [],
  value = '',
  onChange,
  label = 'Seleccionar',
  placeholder = 'Buscar...',
  icon,
  required = false,
}: ComboSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  // cerrar afuera
  useEffect(() => {
    const handleOut = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOut);

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOut
      );
    };
  }, []);

  // obtener texto visible
  const getDisplayText = (item: Item) => {
    return `${item.razonSocial || ''} ${
      item.nombre
        ? `(${item.nombre} ${item.apellido || ''})`
        : ''
    }`.trim();
  };

  // sincronizar valor
  useEffect(() => {
    if (value) {
      const selected = items.find(
        (i) => i._id === value
      );

      if (selected) {
        setQuery(getDisplayText(selected));
      }
    } else {
      setQuery('');
    }
  }, [value, items]);

  // normalizar texto
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // obtener iniciales
  const getInitials = (item: Item) => {
    const nombre = item.nombre || '';
    const apellido = item.apellido || '';
    const razon = item.razonSocial || '';

    const initialsNombreApellido =
      `${nombre.charAt(0)}${apellido.charAt(0)}`;

    const initialsRazon = razon
      .split(' ')
      .map((w: string) => w.charAt(0))
      .join('');

    return normalize(
      `${initialsNombreApellido} ${initialsRazon}`
    );
  };

  // filtro avanzado
  const filtered = items.filter((item) => {
    const q = normalize(query);

    if (!q) return true;

    const razon = normalize(
      item.razonSocial || ''
    );

    const nombre = normalize(item.nombre || '');

    const apellido = normalize(
      item.apellido || ''
    );

    const fullName = `${nombre} ${apellido}`;

    const initials = getInitials(item);

    return (
      razon.includes(q) ||
      nombre.includes(q) ||
      apellido.includes(q) ||
      fullName.includes(q) ||
      initials.includes(q)
    );
  });

  const selectItem = (item: Item) => {
    onChange(item._id);
    setQuery(getDisplayText(item));
    setIsOpen(false);
  };

  const clear = () => {
    onChange('');
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div
      className="space-y-2"
      ref={ref}
    >
      {label && (
        <label className="block text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
          {icon}
          {label}

          {required && (
            <span className="text-amber-400">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <div className="flex items-center w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus-within:ring-2 focus-within:ring-amber-500">
          <svg
            className="w-4 h-4 text-gray-400 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none placeholder-gray-400"
          />

          {query && (
            <button
              type="button"
              onClick={clear}
              className="ml-2 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-xl max-h-64 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() =>
                    selectItem(item)
                  }
                  className="w-full text-left px-4 py-3 hover:bg-amber-500/15 transition-colors text-gray-200 border-b border-gray-700 last:border-b-0"
                >
                  <div className="font-medium">
                    {item.razonSocial}
                  </div>

                  {(item.nombre ||
                    item.apellido) && (
                    <div className="text-sm text-gray-400">
                      {item.nombre}{' '}
                      {item.apellido}
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400">
                Sin resultados
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}