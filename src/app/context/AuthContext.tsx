// app/context/AuthContext.tsx
'use client';
import { createContext, useState, useEffect } from 'react';
import {jwtDecode } from 'jwt-decode';

export const AuthContext = createContext<{
  userRole: string;
  setUserRole: (role: string) => void;
  userEmail: string | null;
  setUserEmail: (email: string | null) => void;
  userName: string | null;
  setUserName: (name: string | null) => void;
}>({
  userRole: 'guest',
  setUserRole: () => {},
  userEmail: null,
  setUserEmail: () => {},
  userName: null,
  setUserName: () => {},
});

import { ReactNode } from 'react';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userRole, setUserRole] = useState('guest');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName ,setUserName ] = useState<string | null>(null);

  // Función para decodificar el token y actualizar el estado
  const updateAuthState = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken: { email: string ; role: string ;name:string} = jwtDecode(token);
        setUserEmail(decodedToken.email); // Guardar el correo del usuario
        setUserRole(decodedToken.role || 'guest'); // Guardar el rol del usuario

        setUserName(decodedToken.name); 
      
      } catch (error) {
        console.error('Error al decodificar el token:', error);
      }
    } else {
      setUserEmail(null);
      setUserRole('guest');
    }
  };

  // Actualizar el estado cuando el componente se monta
  useEffect(() => {
    updateAuthState();
  }, []);

  // Escuchar cambios en localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      updateAuthState();
    };

    // Escuchar el evento 'storage' para detectar cambios en localStorage
    window.addEventListener('storage', handleStorageChange);

    // Limpiar el listener cuando el componente se desmonta
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
     // eslint-disable-next-line @typescript-eslint/no-unused-vars
    <AuthContext.Provider value={{ userRole, setUserRole, userEmail, setUserEmail ,userName ,setUserName}}>
      {children}
    </AuthContext.Provider>
  );
};