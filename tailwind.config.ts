import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Per docs/DESIGN_SYSTEM.md: Source Serif 4, IBM Plex Sans, IBM Plex Mono
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // Design token palette — no default Tailwind colors used in components
        paper: 'var(--color-paper)',
        ink: 'var(--color-ink)',
        'ink-muted': 'var(--color-ink-muted)',
        verdigris: {
          DEFAULT: 'var(--color-verdigris)',
          light: 'var(--color-verdigris-light)',
        },
        'red-pen': {
          DEFAULT: 'var(--color-red-pen)',
          light: 'var(--color-red-pen-light)',
        },
        amber: {
          DEFAULT: 'var(--color-amber)',
          light: 'var(--color-amber-light)',
        },
        indigo: {
          DEFAULT: 'var(--color-indigo)',
          light: 'var(--color-indigo-light)',
        },
        slate: {
          DEFAULT: 'var(--color-slate)',
          light: 'var(--color-slate-light)',
        },
        'line-soft': 'var(--color-line-soft)',
        'line-strong': 'var(--color-line-strong)',
      },
      borderRadius: {
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(26,26,24,0.08)',
        drawer: '-4px 0 24px 0 rgba(26,26,24,0.12)',
        dialog: '0 8px 32px 0 rgba(26,26,24,0.16)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease)',
      },
    },
  },
  plugins: [],
};

export default config;
