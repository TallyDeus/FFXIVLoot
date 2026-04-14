/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      containers: {
        /** Matches MemberList horizontal strip: each role column must be this wide (see MemberList.tsx). */
        roster: '901px',
      },
    },
  },
  plugins: [require('@tailwindcss/container-queries')],
};
