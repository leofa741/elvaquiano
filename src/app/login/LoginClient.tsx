// src/app/login/LoginClient.tsx
'use client';

import dynamic from 'next/dynamic';

const LoginForm = dynamic(() => import('./LoginForm'), { ssr: false });

export default function LoginClient() {
  return <LoginForm />;
}