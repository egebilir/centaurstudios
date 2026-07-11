/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a3a36',
        accent: '#d4af8a',
        'border-color': 'rgba(212, 175, 138, 0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
        arabic: ['Amiri', 'serif'],
      },
    },
  },
  plugins: [],
}
