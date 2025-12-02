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
    extend: {},
  },
  plugins: [],
};

export default config;