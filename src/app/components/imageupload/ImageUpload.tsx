'use client';

import { useState } from 'react';

interface ImageUploadProps {
  label?: string;
  initialImages?: string[];
  onChange: (files: FileList | null) => void;
}

export default function ImageUpload({ label = 'Subir imágenes', initialImages = [], onChange }: ImageUploadProps) {
  const [imagenes, setImagenes] = useState<string[]>(initialImages);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      previewFiles(files);
      onChange(files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      previewFiles(files);
      onChange(files);
    }
  };

  const previewFiles = (files: FileList) => {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const url = URL.createObjectURL(files[i]);
      urls.push(url);
    }
    setImagenes(prev => [...prev, ...urls]);
  };

  const handleRemoveImage = (urlToRemove: string) => {
    setImagenes(prev => prev.filter(url => url !== urlToRemove));
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor="image-upload"
        className={`block p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          id="image-upload"
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span className="mt-2 block text-sm font-medium text-gray-600">
          {label}
        </span>
      </label>

      {imagenes.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
          <div className="flex flex-wrap gap-3">
            {imagenes.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={url}
                  alt={`Previsualización ${i + 1}`}
                  className="h-24 w-24 object-cover rounded-md shadow-sm transition-transform group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(url)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Eliminar imagen"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
