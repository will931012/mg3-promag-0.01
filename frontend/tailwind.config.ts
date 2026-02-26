import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff8ff',
          100: '#dbeefe',
          200: '#bfe3fd',
          300: '#93d3fb',
          400: '#60b8f6',
          500: '#3899ee',
          600: '#237cda',
          700: '#1f63b1',
          800: '#215590',
          900: '#214876',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(14, 38, 64, 0.12)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.2s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
