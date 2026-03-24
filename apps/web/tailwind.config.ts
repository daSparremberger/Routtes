import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── COLOR SYSTEM ───────────────────────────────────────────────────────
      colors: {
        // Brand — Azul inteligência operacional
        brand: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB', // primary action
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        // Sidebar / Shell — Navy dark (base da UI)
        shell: {
          900: '#0B1120', // sidebar bg
          800: '#0F1729', // sidebar hover
          700: '#162035', // sidebar active
          600: '#1E2D45',
          500: '#2A3F5F',
        },
        // Operational — Emerald para estados ativos
        active: {
          light: '#D1FAE5',
          DEFAULT: '#10B981',
          dark:  '#059669',
        },
        // Alert / Attention
        warn: {
          light: '#FEF3C7',
          DEFAULT: '#F59E0B',
          dark:  '#D97706',
        },
        // Danger / Cancel
        danger: {
          light: '#FEE2E2',
          DEFAULT: '#EF4444',
          dark:  '#DC2626',
        },
        // Neutral Surface
        surface: {
          DEFAULT: '#F8FAFC', // page background
          card:    '#FFFFFF',
          hover:   '#F1F5F9',
          border:  '#E2E8F0',
        },
        // Text hierarchy
        ink: {
          primary:   '#0F172A', // slate-900
          secondary: '#475569', // slate-600
          muted:     '#94A3B8', // slate-400
          disabled:  '#CBD5E1', // slate-300
          inverted:  '#F8FAFC', // on dark bg
        },
      },

      // ─── TYPOGRAPHY ─────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        xs:   ['0.75rem',  { lineHeight: '1rem'     }], // 12px
        sm:   ['0.875rem', { lineHeight: '1.25rem'  }], // 14px
        base: ['1rem',     { lineHeight: '1.5rem'   }], // 16px
        lg:   ['1.125rem', { lineHeight: '1.75rem'  }], // 18px
        xl:   ['1.25rem',  { lineHeight: '1.75rem'  }], // 20px
        '2xl':['1.5rem',   { lineHeight: '2rem'     }], // 24px
        '3xl':['1.875rem', { lineHeight: '2.25rem'  }], // 30px
        '4xl':['2.25rem',  { lineHeight: '2.5rem'   }], // 36px
        '5xl':['3rem',     { lineHeight: '1'        }], // 48px
      },

      // ─── SPACING (4pt grid) ──────────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },

      // ─── BORDER RADIUS ───────────────────────────────────────────────────────
      borderRadius: {
        sm:   '4px',
        DEFAULT: '6px',
        md:   '8px',
        lg:   '12px',
        xl:   '16px',
        '2xl':'20px',
        '3xl':'24px',
      },

      // ─── SHADOWS ─────────────────────────────────────────────────────────────
      boxShadow: {
        'card':  '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'card-lg': '0 10px 20px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
        'modal':   '0 25px 50px -12px rgb(0 0 0 / 0.18)',
        'sidebar': '4px 0 24px 0 rgb(0 0 0 / 0.15)',
        'inner-sm': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },

      // ─── LAYOUT ──────────────────────────────────────────────────────────────
      width: {
        sidebar: '240px',
        'sidebar-collapsed': '64px',
      },
      height: {
        header: '60px',
      },

      // ─── ANIMATION ───────────────────────────────────────────────────────────
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in':       'fade-in 200ms ease-out both',
        'slide-up':      'slide-up 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-left': 'slide-in-left 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in':      'scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer':       'shimmer 1.8s infinite linear',
        'pulse-slow':    'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
