/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#b8a952',
          dark: '#1a1a1a',
          light: '#f9f9f9',
          success: '#25D366',
        },
        /** Referência visual estilo Houzz: verde sálvia, fundo creme */
        hz: {
          green: '#3d5c45',
          greenLight: '#5a7d62',
          cream: '#faf9f6',
          sand: '#f0ede8',
          ink: '#242424',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
