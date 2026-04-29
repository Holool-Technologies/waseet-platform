/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe',
          300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1',
          600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81'
        },
        surface: { 50: '#f8fafc', 100: '#f1f5f9', 900: '#0f172a', 950: '#020617' },
        success: { 50: '#f0fdf4', 500: '#22c55e', 700: '#15803d' },
        warning: { 50: '#fffbeb', 500: '#f59e0b', 700: '#b45309' },
        danger:  { 50: '#fef2f2', 500: '#ef4444', 700: '#b91c1c' },
        neutral: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0',
          300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b',
          600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a'
        }
      },
      fontFamily: {
        arabic: ['Cairo', 'Noto Sans Arabic', 'sans-serif'],
        sans:   ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem'
      },
      boxShadow: {
        'soft':  '0 2px 15px -3px rgba(0,0,0,.07), 0 10px 20px -2px rgba(0,0,0,.04)',
        'glow':  '0 0 20px rgba(99,102,241,.3)',
        'card':  '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06)',
      },
      animation: {
        'fade-in':   'fadeIn .2s ease-out',
        'slide-up':  'slideUp .25s ease-out',
        'slide-down':'slideDown .25s ease-out',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 },                         to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-8px)' },to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot:  { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.4)' } },
      }
    }
  },
  plugins: []
}