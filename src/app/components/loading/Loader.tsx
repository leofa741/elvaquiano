'use client';

import { PuffLoader } from 'react-spinners';
import { useContext } from 'react';
import { LoadingContext } from '@/app/context/LoadingContext';

const Loader = () => {
  const { isLoading } = useContext(LoadingContext);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md bg-gradient-to-br from-black/20 via-black/30 to-black/20">
    <PuffLoader color="#00ffff" size={60} />
  </div>
  );
};

export default Loader;
