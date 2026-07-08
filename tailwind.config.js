/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        'bg-subtle': '#F5F5F5',
        border: '#E5E5E5',
        'text-primary': '#1A1A1A',
        'text-secondary': '#6B6B6B',
        accent: '#2B2B2B',
        'accent-hover': '#000000',
        sale: '#C0392B',
        /* ── Dark Ambient Header Tokens ── */
        'header-base': 'var(--color-header-base)',
        'header-mid': 'var(--color-header-mid)',
        'header-deep': 'var(--color-header-deep)',
        'header-text': 'var(--color-header-text)',
        'header-text-muted': 'var(--color-header-text-muted)',
        /* ── Muted Brass/Gold Token ── */
        'accent-gold': 'var(--color-accent-gold)',
        /* ── Heading Visual Accent Tokens ── */
        'heading-primary-start': 'var(--color-heading-primary-start)',
        'heading-primary-mid': 'var(--color-heading-primary-mid)',
        'heading-primary-end': 'var(--color-heading-primary-end)',
        'heading-secondary': 'var(--color-heading-secondary)',
      },
      backgroundImage: {
        'gradient-accent-line': 'var(--gradient-accent-line)',
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'sans-serif'],
        heading: ['Geist', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
