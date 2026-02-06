// app/gestion/categorias/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import Link from 'next/link';
import { 
  Pencil, 
  Trash2, 
  ArrowRight, 
  Plus, 
  Package, 
  FolderOpen, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface Categoria {
  nombre: string;
  productoCount: number;
}

export default function CategoriasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [categoriaNombre, setCategoriaNombre] = useState('');
  const [showReasignarModal, setShowReasignarModal] = useState(false);
  const [categoriaOrigen, setCategoriaOrigen] = useState<string>('');
  const [categoriaDestino, setCategoriaDestino] = useState<string>('');

  // 🔒 Validación de acceso
  useEffect(() => {
    const validateAccess = async () => {
      if (status === 'loading') return;
      if (status === 'unauthenticated') {
        router.push('/');
        return;
      }
      const token = session?.user?.token || localStorage.getItem('token');
      if (!token) {
        toast.error('Acceso denegado: no hay sesión activa');
        router.push('/');
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!['admin', 'superadmin'].includes(payload.role)) {
          toast.error('Acceso restringido a administradores');
          router.push('/');
          return;
        }
        setIsAuthorized(true);
      } catch (err: any) {
        console.error('Error al validar el token:', err);
        toast.error('Sesión inválida o expirada');
        router.push('/');
      }
    };
    validateAccess();
  }, [status, session, router]);

  // 📥 Cargar categorías con contador
  const loadCategorias = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gestion/categorias?includeCount=true');
      if (res.ok) {
        const data = await res.json();
        setCategorias(data.sort((a: Categoria, b: Categoria) => 
          a.nombre.localeCompare(b.nombre)
        ));
      } else {
        toast.error('Error al cargar categorías');
      }
    } catch (err) {
      console.error('Error al cargar categorías:', err);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategorias();
  }, [isAuthorized]);

  // ✏️ Editar categoría
  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setCategoriaNombre(categoria.nombre);
    setShowModal(true);
  };

  // 🔄 Abrir modal de reasignar
  const handleReasignar = (categoria: string) => {
    setCategoriaOrigen(categoria);
    setCategoriaDestino('');
    setShowReasignarModal(true);
  };

  // 🔄 Reasignar productos masivamente
  const handleReasignarConfirm = async () => {
    if (!categoriaDestino.trim()) {
      toast.error('Selecciona una categoría destino');
      return;
    }

    if (categoriaOrigen === categoriaDestino) {
      toast.error('La categoría origen y destino no pueden ser la misma');
      return;
    }

    try {
      const res = await fetch('/api/gestion/categorias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoriaOrigen,
          categoriaDestino,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Productos reasignados correctamente');
        loadCategorias();
        setShowReasignarModal(false);
        setCategoriaOrigen('');
        setCategoriaDestino('');
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Error al reasignar productos');
      }
    } catch (err) {
      console.error('Error al reasignar productos:', err);
      toast.error('Error de conexión');
    }
  };

  // 💾 Guardar categoría (crear o editar)
  const handleSave = async () => {
    if (!categoriaNombre.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      if (editingCategoria) {
        // ✏️ Editar existente
        const res = await fetch('/api/gestion/categorias', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoriaActual: editingCategoria.nombre,
            nuevoNombre: categoriaNombre.trim(),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          toast.success(data.message || 'Categoría actualizada');
          loadCategorias();
          setShowModal(false);
          setEditingCategoria(null);
          setCategoriaNombre('');
        } else {
          const errorData = await res.json();
          toast.error(errorData.error || 'Error al actualizar');
        }
      } else {
        // ➕ Crear nueva
        const res = await fetch('/api/gestion/categorias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: categoriaNombre.trim() }),
        });

        if (res.ok) {
          toast.success('✅ Categoría creada exitosamente');
          loadCategorias();
          setShowModal(false);
          setCategoriaNombre('');
        } else {
          const errorData = await res.json();
          toast.error(errorData.error || 'Error al crear');
        }
      }
    } catch (err) {
      console.error('Error al guardar categoría:', err);
      toast.error('Error de conexión');
    }
  };

  // 🗑️ Eliminar categoría
  const handleDelete = async (categoria: Categoria) => {
    if (categoria.productoCount > 0) {
      // Tiene productos, preguntar si reasignar
      const { value: reasignar } = await Swal.fire({
        title: '⚠️ Categoría en uso',
        html: `
          <div class="text-left">
            <p class="mb-3">Esta categoría tiene <strong class="text-amber-400">${categoria.productoCount}</strong> producto(s).</p>
            <p class="font-semibold mb-2">¿A qué categoría querés reasignarlos?</p>
            <p class="text-sm text-gray-400">Los productos se moverán y la categoría original quedará vacía.</p>
          </div>
        `,
        input: 'select',
        inputOptions: Object.fromEntries(
          categorias
            .filter((c) => c.nombre !== categoria.nombre)
            .map((c) => [c.nombre, `${c.nombre} (${c.productoCount} productos)`])
        ),
        inputPlaceholder: 'Seleccionar categoría destino',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Reasignar y eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
      });

      if (reasignar) {
        try {
          const res = await fetch('/api/gestion/categorias', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              categoria: categoria.nombre,
              reasignarA: reasignar,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            toast.success('✅ ' + (data.message || 'Categoría eliminada y productos reasignados'));
            loadCategorias();
          } else {
            const errorData = await res.json();
            toast.error(errorData.error || 'Error al eliminar');
          }
        } catch (err) {
          toast.error('Error de conexión');
        }
      }
    } else {
      // No tiene productos, eliminar directamente
      const result = await Swal.fire({
        title: '¿Eliminar categoría?',
        html: `
          <div class="text-left">
            <p>Se eliminará permanentemente la categoría:</p>
            <p class="font-bold text-lg mt-2 text-amber-400">"${categoria.nombre}"</p>
            <p class="text-sm text-gray-400 mt-2">Esta acción no se puede deshacer.</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        try {
          const res = await fetch('/api/gestion/categorias', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoria: categoria.nombre }),
          });

          if (res.ok) {
            toast.success('✅ Categoría eliminada correctamente');
            loadCategorias();
          } else {
            const errorData = await res.json();
            toast.error(errorData.error || 'Error al eliminar');
          }
        } catch (err) {
          toast.error('Error de conexión');
        }
      }
    }
  };

  if (!isAuthorized) return null;

  // Calcular estadísticas
  const totalCategorias = categorias.length;
  const totalProductos = categorias.reduce((sum, cat) => sum + cat.productoCount, 0);
  const categoriasConProductos = categorias.filter(cat => cat.productoCount > 0).length;
  const categoriaMasGrande = categorias.length > 0 
    ? categorias.reduce((max, cat) => cat.productoCount > max.productoCount ? cat : max)
    : null;

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8">
      {/* Header con estadísticas */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              Gestión de Categorías
            </h1>
            <p className="text-gray-400 mt-2">
              Organiza y administra las categorías de tus productos
            </p>
            <p className="text-gray-500 mt-1 text-sm">
              volver a la sección de{' '}
              <Link href="/gestion" className="text-amber-400 hover:text-amber-300 underline font-medium">
                Gestión
              </Link>
            </p>
          </div>
          <button
            onClick={() => {
              setEditingCategoria(null);
              setCategoriaNombre('');
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-amber-900/50"
          >
            <Plus size={20} />
            <span className="font-medium">Nueva Categoría</span>
          </button>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <FolderOpen className="text-amber-400" size={24} />
              </div>
              <span className="text-sm font-medium text-gray-400">Total</span>
            </div>
            <div className="text-3xl font-bold text-white">{totalCategorias}</div>
            <div className="text-sm text-gray-400">Categorías</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-blue-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Package className="text-blue-400" size={24} />
              </div>
              <span className="text-sm font-medium text-gray-400">Productos</span>
            </div>
            <div className="text-3xl font-bold text-white">{totalProductos}</div>
            <div className="text-sm text-gray-400">en total</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-green-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <RefreshCw className="text-green-400" size={24} />
              </div>
              <span className="text-sm font-medium text-gray-400">Activas</span>
            </div>
            <div className="text-3xl font-bold text-white">{categoriasConProductos}</div>
            <div className="text-sm text-gray-400">con productos</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <AlertTriangle className="text-purple-400" size={24} />
              </div>
              <span className="text-sm font-medium text-gray-400">Mayor</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {categoriaMasGrande ? categoriaMasGrande.productoCount : 0}
            </div>
            <div className="text-sm text-gray-400 truncate">
              {categoriaMasGrande ? categoriaMasGrande.nombre : 'Sin datos'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de categorías */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          <span className="ml-3 text-gray-400">Cargando categorías...</span>
        </div>
      ) : categorias.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 rounded-xl border-2 border-dashed border-gray-700">
          <FolderOpen className="mx-auto h-16 w-16 text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-300">No hay categorías creadas</h3>
          <p className="mt-2 text-gray-500">Crea tu primera categoría para comenzar a organizar tus productos</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            Crear Primera Categoría
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
                <tr>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {categorias.map((cat) => (
                  <tr 
                    key={cat.nombre} 
                    className="hover:bg-gray-750/50 transition-all duration-200 group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                          <FolderOpen className="text-amber-400" size={20} />
                        </div>
                        <div>
                          <div className="text-white font-semibold text-base">{cat.nombre}</div>
                          {cat.productoCount === 0 && (
                            <div className="text-xs text-gray-500 mt-1">Vacía</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          cat.productoCount > 0 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-gray-600 text-gray-400'
                        }`}>
                          {cat.productoCount}
                        </div>
                        <Package className="text-gray-500" size={16} />
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {/* ✏️ Editar */}
                        <div className="relative group/action">
                          <button
                            onClick={() => handleEdit(cat)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Editar nombre"
                          >
                            <Pencil size={18} />
                          </button>
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover/action:opacity-100 transition-opacity whitespace-nowrap z-10">
                            Editar
                          </span>
                        </div>

                        {/* 🔄 Reasignar productos */}
                        <div className="relative group/action">
                          <button
                            onClick={() => handleReasignar(cat.nombre)}
                            className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                            title="Reasignar productos"
                          >
                            <ArrowRight size={18} />
                          </button>
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover/action:opacity-100 transition-opacity whitespace-nowrap z-10">
                            Reasignar productos
                          </span>
                        </div>

                        {/* 🗑️ Eliminar */}
                        <div className="relative group/action">
                          <button
                            onClick={() => handleDelete(cat)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar categoría"
                          >
                            <Trash2 size={18} />
                          </button>
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover/action:opacity-100 transition-opacity whitespace-nowrap z-10">
                            Eliminar
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para crear/editar categoría */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-700 text-white shadow-2xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
              <div className={`p-3 rounded-xl ${
                editingCategoria 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {editingCategoria ? <Pencil size={24} /> : <Plus size={24} />}
              </div>
              <h3 className="text-2xl font-bold">
                {editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Fiambres, Carnes, Verduras..."
                  value={categoriaNombre}
                  onChange={(e) => setCategoriaNombre(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  El nombre debe ser único y descriptivo
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingCategoria(null);
                    setCategoriaNombre('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-medium transition shadow-lg hover:shadow-amber-900/30"
                >
                  {editingCategoria ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para reasignar productos */}
      {showReasignarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-700 text-white shadow-2xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
                <ArrowRight size={24} />
              </div>
              <h3 className="text-2xl font-bold">Reasignar Productos</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Categoría origen
                </label>
                <div className="px-4 py-3 bg-gray-700 rounded-xl text-white font-medium">
                  {categoriaOrigen}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categoría destino *
                </label>
                <select
                  value={categoriaDestino}
                  onChange={(e) => setCategoriaDestino(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                >
                  <option value="">Seleccionar categoría destino...</option>
                  {categorias
                    .filter(c => c.nombre !== categoriaOrigen)
                    .map((cat) => (
                      <option key={cat.nombre} value={cat.nombre}>
                        {cat.nombre} ({cat.productoCount} productos)
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Todos los productos de la categoría origen se moverán a la categoría destino
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    setShowReasignarModal(false);
                    setCategoriaOrigen('');
                    setCategoriaDestino('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReasignarConfirm}
                  disabled={!categoriaDestino}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition ${
                    categoriaDestino
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg hover:shadow-amber-900/30'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Reasignar Productos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}