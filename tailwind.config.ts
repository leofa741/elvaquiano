// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class', // ← ¡ES OBLIGATORIO!
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}', // si usas pages dir (pero vos usás app dir)
  ],
  theme: {
     extend: {
    colors: {
      bg: "rgb(var(--color-bg) / <alpha-value>)",
      text: "rgb(var(--color-text) / <alpha-value>)",
    },
  },
  },
  plugins: [],
};

export default config;