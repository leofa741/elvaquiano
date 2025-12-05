// components/DarkModeToggle.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { IoSunnyOutline, IoMoonOutline } from "react-icons/io5";

export default function DarkModeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <span className="h-6 w-6 inline-block"></span>;

  const isDarkMode = theme === "dark";

  const toggleDarkMode = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };
  

  return (
    <button
      onClick={toggleDarkMode}
      className="flex items-center space-x-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 
                 text-gray-800 dark:text-gray-200 hover:opacity-80 transition"
    >
      {isDarkMode ? (
        <>
          <IoSunnyOutline size={18} className="text-yellow-500" />
          <span className="text-sm">Claro</span>
        </>
      ) : (
        <>
          <IoMoonOutline size={18} />
          <span className="text-sm">Oscuro</span>
        </>
      )}
    </button>
  );
}