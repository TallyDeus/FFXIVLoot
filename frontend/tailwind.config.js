/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/pages/SchedulePage.tsx', './src/components/schedule/**/*.tsx'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
