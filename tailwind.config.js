/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a', // Deep sapphire/indigo requested
          950: '#172554',
        },
        brand: {
          50: '#f0f5ff',
          100: '#e0ecff',
          200: '#c7dcfe',
          300: '#a4c4fc',
          400: '#79a2f7',
          500: '#547ef0',
          600: '#385ee4',
          700: '#2a48cd',
          800: '#273da5',
          900: '#1e3a8a',
          950: '#172554',
        },
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        slate: {
          850: '#151e2e',
          950: '#0b0f19',
        }
      },
      fontFamily: {
        sans: ['Cairo', 'system-ui', '-apple-system', 'sans-serif'],
        cairo: ['Cairo', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        'card': '0 10px 30px -5px rgba(30, 58, 138, 0.05), 0 0 1px 1px rgba(0, 0, 0, 0.02)',
        'elevated': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
