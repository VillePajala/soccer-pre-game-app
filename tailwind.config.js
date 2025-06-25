const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-rajdhani)', 'Inter', 'sans-serif'],
        display: ['var(--font-rajdhani)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise-texture': "url('/noise.svg')",
      },
    },
  },
  plugins: [],
  safelist: [
    'animate-pulse',
  ],
} 