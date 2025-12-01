'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useContext, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faXmark,
  faUser,
  faBoxes,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import { useSession, signOut } from 'next-auth/react';
import { AuthContext } from '@/app/context/AuthContext';
import SearchBar from '../searchbar/SearchBar';
import MobileSearchBar from '../mobilesearch/MobileSearchBar';
import { faInstagram } from '@fortawesome/free-brands-svg-icons';

const CATEGORIES = [
  { id: 'carnes', name: 'Carnes y Embutidos' },
  { id: 'lácteos', name: 'Lácteos y Huevos' },
  { id: 'panadería', name: 'Panadería y Repostería' },
  { id: 'bebidas', name: 'Bebidas y Jugos' },
  { id: 'conservas', name: 'Conservas y Enlatados' },
  { id: 'congelados', name: 'Productos Congelados' },
];

export default function Navbar() {
  const { data: session } = useSession();
  const { userRole, setUserRole, userName, userEmail } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktopCategoriesOpen, setIsDesktopCategoriesOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
    localStorage.removeItem('token');
    localStorage.removeItem('purchaseData');
    localStorage.removeItem('cart');
    setUserRole('guest');
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setMobileCategoryOpen(false);
    setIsDesktopCategoriesOpen(false);
  };

  const role = session?.user?.role || userRole;
  const name = session?.user?.name || userName;
  const email = session?.user?.email || userEmail;

  // Cerrar dropdown al hacer scroll
  useEffect(() => {
    const handleScroll = () => setIsDesktopCategoriesOpen(false);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="bg-red-600 text-white shadow-lg fixed top-0 w-full z-50">
      {/* Header principal */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center justify-between py-2.5">
        {/* Logo (izquierda en escritorio) */}
        <div className="lg:hidden">
          <Link href="/" onClick={closeMenu}>
            <Image
              src="/El-Vaquiano.png"
              alt="Distribuidora El Vaquiano"
              width={120}
              height={40}
              priority
            />
          </Link>
        </div>

        {/* Buscador solo visible en pantallas grandes */}
        <div className="hidden lg:flex flex-1 justify-start">
          <div className="w-full max-w-lg">
            <SearchBar />
          </div>
        </div>


        {/* Logo centrado solo en escritorio */}
        <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2">

          <Image
            src="/El-Vaquiano.png"
            alt="Distribuidora El Vaquiano"
            width={140}
            height={45}
            priority
          />

        </div>

        {/* Íconos y auth (derecha) */}
        <div className="flex items-center space-x-4">
          <a
            href="https://www.instagram.com/el_vaquiano"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-amber-200 transition-colors"
            aria-label="Instagram"
          >
            <FontAwesomeIcon icon={faInstagram} className="text-xl" />
          </a>

          {session ? (
            <div className="hidden lg:block text-xs max-w-[120px] truncate opacity-90">
              {name || email}
            </div>
          ) : null}

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-1.5 text-white hover:text-amber-200 focus:outline-none"
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            <FontAwesomeIcon icon={isMenuOpen ? faXmark : faBars} className="text-2xl" />
          </button>
        </div>
      </div>

      {/* Navegación principal - escritorio */}
      <div className="hidden lg:flex bg-red-700 py-2">
        <div className="max-w-7xl mx-auto px-6 flex items-center space-x-6">
          <Link
            href="/"
            className="font-medium hover:text-amber-200 transition-colors py-1"
          >
            Inicio
          </Link>

          {/* Dropdown de categorías */}
          <div className="relative">
            <button
              onMouseEnter={() => setIsDesktopCategoriesOpen(true)}
              className="font-medium hover:text-amber-200 transition-colors py-1 flex items-center gap-1"
              aria-haspopup="true"
              aria-expanded={isDesktopCategoriesOpen}
            >
              Categorías
              <FontAwesomeIcon
                icon={isDesktopCategoriesOpen ? faChevronUp : faChevronDown}
                className="text-xs"
              />
            </button>

            {isDesktopCategoriesOpen && (
              <div
                onMouseLeave={() => setIsDesktopCategoriesOpen(false)}
                className="absolute left-0 mt-1 w-56 bg-white shadow-xl rounded-lg py-2 z-50"
              >
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categoria/${cat.id}`}
                    className="block px-4 py-2.5 text-gray-800 hover:bg-red-50 font-medium"
                    onClick={closeMenu}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/contact"
            className="font-medium hover:text-amber-200 transition-colors py-1"
          >
            Contacto
          </Link>

          {/* Auth en escritorio */}
          {session ? (
            <div className="ml-auto flex items-center space-x-6">

              <Link
                href="/profile"
                className="flex items-center gap-1 hover:text-amber-200 transition-colors"
                title="Perfil"
              >
                <FontAwesomeIcon icon={faUser} />
                <span className="text-sm">Perfil</span>
              </Link>
              {(role === 'admin' || role === 'vendedor') && (
                <>
                  <Link
                    href="/admin"
                    className="flex items-center gap-1 hover:text-amber-200 transition-colors"
                    title="Admin"
                  >
                    <FontAwesomeIcon icon={faUser} />
                    <span className="text-sm">Admin usuarios</span>
                  </Link>
                  <Link
                    href="/gestion"
                    className="flex items-center gap-1 hover:text-amber-200 transition-colors"
                    title="Subir Productos"
                  >
                    <FontAwesomeIcon icon={faBoxes} />
                    <span className="text-sm">Gestion Operativa</span>
                  </Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="text-sm hover:text-amber-200 transition-colors"
              >
                Salir
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3 ml-auto">
              <Link href="/login" className="text-sm hover:text-amber-200 transition-colors">
                Iniciar
              </Link>
              <Link href="/register" className="text-sm hover:text-amber-200 transition-colors">
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Menú móvil */}
      {isMenuOpen && (
        <div className="lg:hidden bg-red-700 py-4">
          <div className="max-w-7xl mx-auto px-4">
            <MobileSearchBar isMenuOpen={isMenuOpen} closeMenu={closeMenu} />

            <div className="space-y-1 mt-4">
              <Link
                href="/"
                onClick={closeMenu}
                className="block py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Inicio
              </Link>

              {/* Categorías móviles */}
              <div>
                <button
                  onClick={() => setMobileCategoryOpen(!mobileCategoryOpen)}
                  className="w-full flex justify-between items-center py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Categorías
                  <FontAwesomeIcon
                    icon={mobileCategoryOpen ? faChevronUp : faChevronDown}
                    className="text-sm"
                  />
                </button>
                {mobileCategoryOpen && (
                  <div className="mt-1 space-y-1 pl-4">
                    {CATEGORIES.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/categoria/${cat.id}`}
                        onClick={closeMenu}
                        className="block py-2 px-2 rounded hover:bg-red-600 transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/contact"
                onClick={closeMenu}
                className="block py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Contacto
              </Link>

              {session ? (
                <>
                  <Link
                    href="/profile"
                    onClick={closeMenu}
                    className="flex items-center py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <FontAwesomeIcon icon={faUser} className="mr-3" /> Perfil
                  </Link>
                  {role === 'admin' && (
                    <>
                      <Link
                        href="/admin"
                        onClick={closeMenu}
                        className="flex items-center py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <FontAwesomeIcon icon={faUser} className="mr-3" /> Panel Admin
                      </Link>
                      <Link
                        href="/admin/categorias"
                        onClick={closeMenu}
                        className="flex items-center py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <FontAwesomeIcon icon={faBoxes} className="mr-3" /> Subir Productos
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => {
                      closeMenu();
                      handleLogout();
                    }}
                    className="w-full text-left py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="block py-2.5 px-4 rounded-lg bg-white text-red-700 font-medium text-center"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMenu}
                    className="block py-2.5 px-4 rounded-lg border border-white text-white font-medium text-center"
                  >
                    Registrarse
                  </Link>
                </div>
              )}

              {session && (
                <div className="mt-4 pt-3 border-t border-red-500 text-sm opacity-90 px-4">
                  <p>{role === 'admin' ? 'Administrador' : 'Cliente'}</p>
                  <p className="truncate">{name || email}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}