/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eeeffe',
          100: '#d5d6fc',
          200: '#b3b5f8',
          300: '#8a8cf2',
          400: '#6c6fec',
          500: '#5254e7',
          600: '#4547d4',
          700: '#3638bb',
          800: '#2c2e97',
          900: '#1e1f6b',
        },
        surface: {
          light: {
            base:    '#ffffff',
            raised:  '#f7f7f8',
            overlay: '#f0f0f2',
            border:  '#e4e4e8',
            muted:   '#e9e9ec',
          },
          dark: {
            base:    '#0f0f11',
            raised:  '#17171a',
            overlay: '#1f1f24',
            border:  '#2a2a32',
            muted:   '#24242c',
          }
        }
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: .6 } },
      }
    },
  },
  plugins: [],
}
