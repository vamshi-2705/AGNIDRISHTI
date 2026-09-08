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
        defense: {
          darkest: '#080c14',
          dark: '#0b0f19',
          card: 'rgba(15, 23, 42, 0.85)',
          border: 'rgba(51, 65, 85, 0.6)',
          accent: '#38bdf8',
          emergency: '#ef4444',
          flare: '#f97316',
          coal: '#eab308',
          stubble: '#22c55e',
          forest: '#10b981'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
};
