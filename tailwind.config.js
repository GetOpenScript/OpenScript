/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js,jsx}",
    "./src/*.{html,js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#041322',
          900: '#072138',
          800: '#0b2d4c',
          700: '#0e3a63',
          600: '#144e83',
        },
        slatebg: '#ebedf0',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
};
