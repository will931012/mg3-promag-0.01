import type { Config } from 'tailwindcss'

// Colors come from CSS variables (src/index.css) so the day and night themes can swap them.
// The slate/brand/status ramps keep their usual names: in the night theme the light shades
// become dark surfaces and the dark shades become light text, so `bg-slate-50 text-slate-900`
// reads correctly in both themes.
const themed = (name: string) => `rgb(var(--${name}) / <alpha-value>)`
const ramp = (family: string, shades: number[]) => Object.fromEntries(shades.map((shade) => [shade, themed(`${family}-${shade}`)]))

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: ramp('slate', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        brand: ramp('brand', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        emerald: ramp('emerald', [50, 100, 200, 300, 600, 700, 800]),
        rose: ramp('rose', [50, 100, 200, 300, 600, 700, 800]),
        amber: ramp('amber', [50, 100, 200, 300, 700, 800]),
        sky: ramp('sky', [50, 100, 200, 700, 800]),
        // Surfaces and text of the app shell
        canvas: themed('canvas'),
        frame: themed('frame'),
        sidebar: themed('sidebar'),
        main: themed('main'),
        surface: themed('surface'),
        card: themed('card'),
        raised: themed('raised'),
        hover: themed('hover'),
        line: themed('line'),
        ink: { DEFAULT: themed('ink'), soft: themed('ink-soft'), muted: themed('ink-muted') },
        accent: { DEFAULT: themed('accent'), teal: themed('accent-teal'), gold: themed('accent-gold') },
        nav: { active: themed('nav-active'), 'active-ink': themed('nav-active-ink') },
        hero: { DEFAULT: themed('hero'), ink: themed('hero-ink'), muted: themed('hero-muted') },
      },
      // Used by `border` without a color class.
      borderColor: {
        DEFAULT: themed('slate-200'),
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
