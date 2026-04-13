/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          400: '#6b8cff',
          500: '#4f6ef7',
          600: '#3a55e8',
          700: '#2d44d4',
          900: '#1a2a8a',
        },
        surface: {
          light: '#f8fafc',
          dark:  '#0f1117',
        }
      },
      fontFamily: {
        arabic: ['Cairo', 'Noto Sans Arabic', 'sans-serif'],
        latin:  ['Inter', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
