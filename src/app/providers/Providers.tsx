// app/providers/Providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../context/AuthContext';
import { LoadingProvider } from '../context/LoadingContext';
import { ThemeProvider } from 'next-themes';


export function Providers({ children }: { children: React.ReactNode }) {
  return (



    <SessionProvider>

      <AuthProvider>
        <LoadingProvider>
          <ThemeProvider
           attribute="class"
            enableSystem={false}>
            {children}
          </ThemeProvider>
        </LoadingProvider>
      </AuthProvider>

    </SessionProvider>


  );
}