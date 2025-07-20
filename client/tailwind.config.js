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
      }
    },
  },
  plugins: [],
}