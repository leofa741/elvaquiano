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
import DarkModeToggle from '../darkmode/DarkModeToggle';

export default function Navbar() {
  const { data: session } = useSession();
  const { userRole, setUserRole, userName, userEmail } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktopCategoriesOpen, setIsDesktopCategoriesOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetch('/api/gestion/public/categorias')
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);
        setLoadingCategories(false);
      })
      .catch(() => {
        setLoadingCategories(false);
        console.error('Error al cargar categorías');
      });
  }, []);

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
    <nav className="bg-[#0b1f0b] text-white shadow-lg fixed top-0 w-full z-50">
      {/* Header principal */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center justify-between py-2.5">
        {/* Logo móvil */}
        <div className="lg:hidden">
          <Link href="/" onClick={closeMenu}>
            <Image                                      
             src="/img/logo-escolar-1-removebg-preview.png"  // img/logo-sanvalentin-removebg-preview.png  El-Vaquiano.png
              alt="Distribuidora El Vaquiano"
              width={120}
              height={40}
              priority
            />
          </Link>
        </div>

        {/* Buscador desktop */}
        <div className="hidden lg:flex flex-1 justify-start">
          <div className="w-full max-w-lg">
            <SearchBar />
          </div>
        </div>

        {/* Logo centrado desktop */}
        <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2">
          <Image
            src="/img/logodemayosinfondo.png"
            alt="Distribuidora El Vaquiano"
            width={120}
            height={35}
            priority
          />
        </div>

        {/* Íconos y auth */}
        <div className="flex items-center space-x-4">
          <DarkModeToggle />

          <a
            href="https://www.instagram.com/el_vaquiano"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-200 transition-colors"
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

      {/* Navegación escritorio */}
      <div className="hidden lg:flex items-center h-12 bg-[#145214]">
        <div className="max-w-7xl mx-auto px-6 flex items-center space-x-6">
          <Link href="/" className="font-medium hover:text-amber-200 transition-colors py-1">
            Inicio
          </Link>

          {/* Dropdown categorías escritorio */}
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
                className="absolute left-0 mt-1 w-56 bg-white shadow-xl rounded-lg py-2 z-50 max-h-96 overflow-y-auto"
              >
                {loadingCategories ? (
                  <span className="block px-4 py-2 text-gray-500 italic">Cargando...</span>
                ) : categories.length > 0 ? (
                  categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/categoria/${cat.slug}`}
                      className="block px-4 py-2.5 text-gray-800 hover:bg-[#e0f0e0] font-medium transition-colors"
                      onClick={closeMenu}
                    >
                      {cat.name}
                    </Link>
                  ))
                ) : (
                  <span className="block px-4 py-2 text-gray-500 italic">Sin categorías</span>
                )}
              </div>
            )}
          </div>

          <Link
            href="/contact"
            className="font-medium hover:text-amber-200 transition-colors py-1"
          >
            Contacto
          </Link>

          {/* Auth escritorio */}
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
                    <span className="text-sm">Gestión Operativa</span>
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
            </div>
          )}
        </div>
      </div>

      {/* Menú móvil */}
      {isMenuOpen && (
        <div className="lg:hidden bg-[#145214] max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4">
            <MobileSearchBar isMenuOpen={isMenuOpen} closeMenu={closeMenu} />

            <div className="space-y-1 mt-4 pb-6">
              <Link
                href="/"
                onClick={closeMenu}
                className="block py-2.5 px-4 rounded-lg hover:bg-[#0b3a0b] transition-colors font-medium"
              >
                Inicio
              </Link>

              {/* Categorías móviles con scroll */}
              <div>
                <button
                  onClick={() => setMobileCategoryOpen(!mobileCategoryOpen)}
                  className="w-full flex justify-between items-center py-2.5 px-4 rounded-lg hover:bg-[#0b3a0b] transition-colors font-medium"
                >
                  Categorías
                  <FontAwesomeIcon
                    icon={mobileCategoryOpen ? faChevronUp : faChevronDown}
                    className="text-sm"
                  />
                </button>
                {mobileCategoryOpen && (
                  <div className="mt-1 pl-4 max-h-60 overflow-y-auto">
                    {loadingCategories ? (
                      <p className="py-2 text-gray-300 italic">Cargando...</p>
                    ) : categories.length > 0 ? (
                      categories.map((cat) => (
                        <Link
                          key={cat.slug}
                          href={`/categoria/${cat.slug}`}
                          onClick={closeMenu}
                          className="block py-2 px-2 rounded hover:bg-[#0b3a0b] transition-colors"
                        >
                          {cat.name}
                        </Link>
                      ))
                    ) : (
                      <p className="py-2 text-gray-300 italic">Sin categorías</p>
                    )}
                  </div>
                )}
              </div>

              <Link
                href="/contact"
                onClick={closeMenu}
                className="block py-2.5 px-4 rounded-lg hover:bg-[#0b3a0b] transition-colors font-medium"
              >
                Contacto
              </Link>

              {session ? (
                <>
                  <Link
                    href="/profile"
                    onClick={closeMenu}
                    className="flex items-center py-2.5 px-4 rounded-lg hover:bg-[#0b3a0b] transition-colors"
                  >
                    <FontAwesomeIcon icon={faUser} className="mr-3" /> Perfil
                  </Link>
                  {role === 'admin' && (
                    <>
                      <Link
                        href="/admin"
                        onClick={closeMenu}
                        className="flex items-center py-2.5 px-4 rounded-lg hover:bg-[#0b3a0b] transition-colors"
                      >
                        <FontAwesomeIcon icon={faUser} className="mr-3" /> Admin Usuarios
                      </Link>
                      <Link
                        href="/gestion"
                        onClick={closeMenu}
                        className="flex items-center py-2.5 px-4 rounded-lg hover:bg-[#0b3a0b] transition-colors"
                      >
                        <FontAwesomeIcon icon={faBoxes} className="mr-3" /> Gestión Operativa
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => {
                      closeMenu();
                      handleLogout();
                    }}
                    className="w-full text-left py-2.5 px-4 rounded-lg hover:bg-[#0b3a0b] transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="block py-2.5 px-4 rounded-lg bg-white text-[#145214] font-medium text-center"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              )}

              {session && (
                <div className="mt-4 pt-3 border-t border-[#0b3a0b] text-sm opacity-90 px-4">
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