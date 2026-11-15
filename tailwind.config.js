/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        ninja: ['Shojumaru', 'Orbitron', 'cursive', 'sans-serif'],
        arcade: ['Shojumaru', 'Orbitron', 'monospace', 'sans-serif'],
        sans: ['Rajdhani', 'sans-serif'],
      },
      colors: {
        chakra: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        uchiha: {
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
        },
        leaf: {
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        shinobi: {
          800: '#1c2237',
          900: '#121625',
          950: '#0a0d16',
        },
        scroll: {
          100: '#fffdf5',
          200: '#fef3c7',
          300: '#fde68a',
        }
      }
    },
  },
  plugins: [],
}
