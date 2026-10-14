/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        flood: {
          safe: '#059669',     // emerald-600
          watch: '#d97706',    // amber-600
          prepare: '#ea580c',  // orange-600
          danger: '#dc2626',   // red-600
          dark: '#0f172a',
          surface: '#1e293b'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}
