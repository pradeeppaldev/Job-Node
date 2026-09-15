/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'footer-up': '0px -50px 80px rgba(62, 45, 117, 0.4)',
      },
      colors: {
        'dark-200': '#475467',
        'light-blue-100': '#c1d3f81a',
        'light-blue-200': '#a7bff14d',
        'badge-green': '#d5faf1',
        'badge-red': '#f9e3e2',
        'badge-yellow': '#fceed8',
        'badge-green-text': '#254d4a',
        'badge-red-text': '#752522',
        'badge-yellow-text': '#73321b',
      }
    },
  },
  plugins: [],
}