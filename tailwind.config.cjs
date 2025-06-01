/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-gradient-to-br',
    'from-slate-900',
    'via-blue-900',
    'to-cyan-900',
    'from-gray-900',
    'via-gray-800',
    'to-black',
    {
      pattern: /bg-(black|white)\/[0-9]+/,
    },
    {
      pattern: /from-(blue|gray|slate)-[0-9]+/,
    },
    {
      pattern: /to-(cyan|black)-[0-9]+/,
    },
    {
      pattern: /via-(blue|gray)-[0-9]+/,
    },
  ],
  theme: {
    extend: {
      colors: {
        'black/70': 'rgba(0, 0, 0, 0.7)',
        'black/60': 'rgba(0, 0, 0, 0.6)',
        'white/20': 'rgba(255, 255, 255, 0.2)',
        'white/30': 'rgba(255, 255, 255, 0.3)',
        'white/10': 'rgba(255, 255, 255, 0.1)',
      },
      backgroundImage: {
        'gradient-to-br': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
        'gradient-to-t': 'linear-gradient(to top, var(--tw-gradient-stops))',
        'gradient-to-r': 'linear-gradient(to right, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
} 