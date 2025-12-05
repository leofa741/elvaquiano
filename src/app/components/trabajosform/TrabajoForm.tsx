'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from '../imageupload/ImageUpload';

interface TrabajoData {
  _id?: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  imagenes: string[];
}

interface Props {
  initialData?: TrabajoData;
}

export default function TrabajoForm({ initialData }: Props) {
  const router = useRouter();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [archivos, setArchivos] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  const UPLOAD_PRESET = 'preset';
  const CLOUD_NAME = 'dpooazdeg';

  useEffect(() => {
    if (initialData) {
      setTitulo(initialData.titulo || '');
      setDescripcion(initialData.descripcion || '');
      setCategoria(initialData.categoria || '');
      setImagenes(initialData.imagenes || []);
    }
  }, [initialData]);

  const handleUpload = async (): Promise<string[]> => {
    if (!archivos || archivos.length === 0) return [];

    const urls: string[] = [];

    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        urls.push(data.secure_url);
      } else {
        console.error('Error al subir imagen:', data);
        alert(`Error al subir la imagen: ${file.name}`);
      }
    }

    return urls;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const uploadedUrls = await handleUpload();
    const allImagenes = [...imagenes, ...uploadedUrls];

    const body = {
      titulo,
      descripcion,
      categoria,
      imagenes: allImagenes,
    };

    const method = initialData ? 'PUT' : 'POST';
    const url = initialData && initialData._id
      ? `/api/trabajos?id=${initialData._id}`
      : '/api/trabajos';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push('/trabajos-realizados');
    } else {
      const errorData = await res.json();
      console.error('Error del servidor:', errorData);
      alert('Ocurrió un error al guardar el trabajo');
    }

    setLoading(false);
  };

  const handleRemoveImagen = (url: string) => {
    const filtered = imagenes.filter((img) => img !== url);
    setImagenes(filtered);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Titulo del Trabajo"
        className="w-full border p-2 rounded"
        required
      />

      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción"
        className="w-full border p-2 rounded"
        required
      />

      <input
        type="text"
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        placeholder="Categoría"
        className="w-full border p-2 rounded"
        required
      />

      <ImageUpload
        initialImages={imagenes}
        onChange={(files) => setArchivos(files)}
      />

      {/* Vista previa de imágenes ya subidas */}
      <div className="flex flex-wrap gap-2">
        {imagenes.map((url, i) => (
          <div key={i} className="relative">
            <img src={url} alt={`Imagen ${i + 1}`} className="h-24 w-24 object-cover rounded" />
            <button
              type="button"
              onClick={() => handleRemoveImagen(url)}
              className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
              aria-label="Eliminar imagen"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? 'Guardando...' : 'Guardar Trabajo'}
      </button>
    </form>
  );
}
