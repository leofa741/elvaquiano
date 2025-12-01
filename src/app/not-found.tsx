"use client"; 
import { useEffect } from "react";
import { useRouter } from "next/navigation"; // Para App Router
// import { useRouter } from "next/router"; // Para Pages Router

export default function NotFoundRedirect() {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      router.push("/");
    }, 3000); // Redirige después de 3 segundos
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center p-6">
      <h1 className="text-6xl font-bold text-gray-800">404</h1>
      <p className="text-xl text-gray-600 mt-4">Redirigiendo a la página principal...</p>
    </div>
  );
}
