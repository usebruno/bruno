/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      spacing: {
        0: '0px',
        0.25: '1px',
        '1/2': '2px',
        0.5: '2px',
        0.75: '3px',
        1: '4px'
      }
    }
  },
  plugins: []
};
