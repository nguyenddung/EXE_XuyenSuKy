/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#19363a',
        muted: '#647477',
        cream: '#f7f5ef',
        paper: '#fffdf8',
        coral: '#d8654e',
        teal: '#28797a',
        gold: '#e9b76b',
      },
      boxShadow: {
        soft: '0 18px 55px rgba(31, 53, 53, .07)',
      },
    },
  },
  plugins: [],
}
