'use client';
import { createContext, useState, useEffect, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

// Definimos la interfaz para el contexto
interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;

}

// Creamos el contexto con un valor por defecto
export const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setIsLoading: () => { }, // Función vacía como marcador de posición
});

// Proveedor del contexto
export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname(); // Obtener la ruta actual

  // Activar el estado de carga cuando cambia la ruta
  useEffect(() => {
    setIsLoading(true); // Activar carga al cambiar de ruta

    // Simular una carga (puedes ajustar el tiempo según sea necesario)
    const timer = setTimeout(() => {
      setIsLoading(false); // Desactivar carga después de un tiempo
    }, 600); // Ajusta este tiempo según tus necesidades

    return () => clearTimeout(timer); // Limpiar el temporizador al desmontar
  }, [pathname]);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

// Hook personalizado para consumir el contexto
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider provider');
  }
  return context;
};