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
        ag: {
          // Anti-Gravity TraceIQ Cyber-Ops Palette
          darkBg: '#000000',
          darkSurface: '#0A0500',
          darkCard: '#131313',
          darkBorder: '#3D1A00',
          darkBorderSubtle: '#1A0B00',

          // Anti-Gravity Accent Tokens
          primary: '#FF6B00',
          primaryGlow: '#FF8C38',
          success: '#32D74B',
          danger: '#FF3B30'
        }
      },
      fontFamily: {
        sans: ['"Google Sans"', '"Open Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Google Sans"', '"Open Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace']
      },
      boxShadow: {
        'glow-primary': '0 0 8px rgba(255, 107, 0, 0.4)',
        'glow-primary-lg': '0 0 16px rgba(255, 107, 0, 0.6)',
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(to right, rgba(255, 107, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 107, 0, 0.05) 1px, transparent 1px)',
      }
    },
  },
  plugins: [],
}
