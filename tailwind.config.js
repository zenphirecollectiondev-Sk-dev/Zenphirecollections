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
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'sans-serif'],
        heading: ['Geist', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
