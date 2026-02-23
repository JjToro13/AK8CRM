/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores personalizados para los estados de llamada
        'status-gray': '#6B7280',
        'status-red': '#EF4444',
        'status-yellow': '#F59E0B',
        'status-green': '#10B981',
        'status-blue': '#3B82F6',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
