// src/app/gestion/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    FaBox,
    FaUsers,
    FaShoppingCart,
    FaTruck,
    FaFileInvoice,
    FaChartLine,
} from 'react-icons/fa';

// Módulos disponibles
const modules = [
    {
        id: 'productos',
        title: 'Gestión de Productos',
        description: 'Administrar nombres, categorías, stock, lotes y vencimientos.',
        icon: <FaBox className="text-3xl text-amber-400" />,
        href: '/gestion/productos',
    },
    {
        id: 'clientes',
        title: 'Gestión de Clientes',
        description: 'Comercios, restaurantes, kioscos y sus condiciones comerciales.',
        icon: <FaUsers className="text-3xl text-amber-400" />,
        href: '/gestion/clientes'
    },
    {
        id: 'pedidos',
        title: 'Pedidos',
        description: 'Cargar, seguir y gestionar pedidos desde el inicio hasta la entrega.',
        icon: <FaShoppingCart className="text-3xl text-amber-400" />,
        href: '/gestion/pedidos',
    },
    {
        id: 'presupuestos',
        title: 'Presupuestos',
        description: 'Crear, imprimir y convertir cotizaciones en pedidos.',
        icon: <FaFileInvoice className="text-3xl text-amber-400" />,
        href: '/gestion/presupuestos',
    },
    {
        id: 'categorias',
        title: 'Categorías',
        description: 'Administrar las categorías de tus productos.',
        icon: <FaBox className="text-3xl text-amber-400" />,
        href: '/gestion/categorias',
    },
    {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Cuentas Corrientes, Gestión financiera de clientes con saldo pendiente',
        icon: <FaChartLine className="text-3xl text-amber-400" />,
        href: '/gestion/dashboard',
    },
    {
        id: 'logs',
        title: 'Auditoria',
        description: 'Ver historial de inicios de sesión de usuarios.',
        icon: <FaFileInvoice className="text-3xl text-amber-400" />,
        href: '/gestion/logs',
    }
];

export default function GestiónPage() {
    const { status, data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    
    // ✅ Estado para controlar si ya se validó el rol
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    // 🔒 Validación estricta de autenticación y rol
    useEffect(() => {
        const validateAccess = async () => {
            if (status === 'loading') return;

            // Si no está autenticado
            if (status === 'unauthenticated') {
                router.push('/login');
                setIsAuthorized(false);
                return;
            }

            // Verificar token y rol
            const token = session?.user?.token || localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                setIsAuthorized(false);
                return;
            }

            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const allowedRoles = ['superadmin', 'admin', 'vendedor'];
                
                if (!allowedRoles.includes(payload.role)) {
                    // ✅ Redirigir a página de usuario común (perfil, home, etc.)
                    router.push('/');
                    setIsAuthorized(false);
                    return;
                }
                
                // ✅ Autorizado
                setIsAuthorized(true);
            } catch (err) {
                console.error('Token inválido', err);
                router.push('/login');
                setIsAuthorized(false);
            }
        };

        validateAccess();
    }, [status, session, router, pathname]);

    // ✅ Mientras se valida, mostrar loader (NO null)
    if (status === 'loading' || isAuthorized === null) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
                    <p className="text-gray-400 text-lg">Verificando permisos...</p>
                </div>
            </div>
        );
    }

    // ✅ Si no está autorizado, no mostrar nada (ya se redirigió)
    if (!isAuthorized) {
        return null;
    }

    // ✅ Solo renderizar si pasa todas las validaciones
    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            <header className="mb-10 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-white">Gestión Operativa</h1>
                <p className="text-gray-400 mt-2">
                    Accedé a los módulos de tu distribuidora en un solo lugar.
                </p>
            </header>

            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((module) => (
                        <Link
                            key={module.id}
                            href={module.href}
                            className="block group"
                        >
                            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 transition-all duration-300 hover:bg-gray-750 hover:shadow-lg hover:shadow-amber-900/20">
                                <div className="flex items-start">
                                    <div className="p-3 bg-amber-900/20 rounded-lg mr-4 group-hover:bg-amber-900/30 transition-colors">
                                        {module.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-white mb-2">{module.title}</h2>
                                        <p className="text-gray-400 text-sm leading-relaxed">{module.description}</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}