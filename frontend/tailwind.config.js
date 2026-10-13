/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#070A10',
          900: '#0B0F19',
          800: '#111726',
          700: '#151C2C',
          600: '#1E293B',
        },
        neural: {
          cyan: '#06B6D4',
          cyanGlow: '#22D3EE',
        },
        alignment: {
          emerald: '#10B981',
          crimson: '#EF4444',
          amber: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.25)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.25)',
        'glow-crimson': '0 0 25px -5px rgba(239, 68, 68, 0.25)',
      },
    },
  },
  plugins: [],
}
