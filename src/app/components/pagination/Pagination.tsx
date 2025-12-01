'use client';

import React, { useEffect, useState } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const getPageNumbers = () => {
    const width = window.innerWidth;
    const maxVisiblePages =
      width < 640 ? 3 : // Móvil
      width < 768 ? 4: // Tableta
      width < 1024 ? 5 : // Pantalla mediana
      5; // Pantalla grande

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: Array<number | string> = [];
    let left = Math.max(2, currentPage - 1);
    let right = Math.min(totalPages - 1, currentPage + 1);

    pages.push(1);

    if (left > 2) {
      pages.push('...');
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < totalPages - 1) {
      pages.push('...');
    }

    pages.push(totalPages);

    return pages;
  };

  const [pageNumbers, setPageNumbers] = useState<Array<number | string>>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const handleResize = () => {
      setPageNumbers(getPageNumbers());
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPage, totalPages, isClient]);

  return (
    <nav className="flex justify-center items-center flex-wrap gap-1 md:gap-2 mt-6 mb-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition"
        aria-label="Página anterior"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          viewBox="0 0 24 24"
          className="w-4 h-4"
        >
          <path d="M15.41 7.41L10.83 12l4.58 4.59L14 18l-6-6 6-6 1.41 1.41z" />
        </svg>
      </button>

      {pageNumbers.map((number, index) =>
        typeof number === 'string' ? (
          <span key={`${number}-${index}`} className="px-2 select-none">
            ...
          </span>
        ) : (
          <button
            key={number}
            onClick={() => onPageChange(number)}
            className={`px-3 py-1 rounded transition ${
              currentPage === number
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            aria-current={currentPage === number ? 'page' : undefined}
          >
            {number}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition"
        aria-label="Página siguiente"
      >
        
   
        <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 24 24"
    className="w-4 h-4"
  >
    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
  </svg>

      
      </button>
    </nav>
  );
};

export default Pagination;