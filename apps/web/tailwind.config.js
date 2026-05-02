/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EEF1F7',
          100: '#D5DDED',
          200: '#ABBBD9',
          500: '#4A6499',
          600: '#2D4472',
          700: '#243860',
          800: '#1C2D4E',
          900: '#14203A',
        },
        teal: {
          300: '#A8D5D8',
          400: '#7BBFC4',
          500: '#5AACB2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        modal: '0 20px 60px -12px rgb(0 0 0 / 0.25)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
};
