// types/next-auth.d.ts
import "next-auth";

// Extiende el tipo de sesión de NextAuth para incluir el token y otras propiedades
declare module "next-auth" {
  interface Session {
    user: {
      [x: string]: string;
      id: string;
      email: string;
      name?: string | null;
      lastName?: string | null; // Agregar lastName
      phone?: string | null;    // Agregar phone
      image?: string | null;
      role: string;
      token?: string; // Agrega el token aquí
    };
  }

  // Extiende el tipo User para incluir las mismas propiedades
  interface User {
    id: string;
    email: string;
    name?: string | null;
    lastName?: string | null; // Agregar lastName
    phone?: string | null;    // Agregar phone
    image?: string | null;
    role: string;
    google?: boolean;
  }
}