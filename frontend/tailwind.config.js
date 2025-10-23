/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-primary': '#1a1a2e',
        'dark-secondary': '#16213e',
        'dark-accent': '#0f3460',
        'dark-text': '#e94560',
        'dark-text-secondary': '#a0a0a0',
        'dark-border': '#2c3e50',
      },
    },
  },
  plugins: [],
}
