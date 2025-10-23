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
        'dark-panel-left': '#16213e',
        'dark-panel-middle': '#1a2a4c',
        'dark-panel-right': '#1f345f',
        'dark-accent': '#0f3460',
        'dark-text': '#e94560',
        'dark-text-secondary': '#a0a0a0',
        'dark-border': '#2c3e50',
        'high-contrast-primary': 'var(--color-primary)',
        'high-contrast-secondary': 'var(--color-secondary)',
        'high-contrast-accent': 'var(--color-accent)',
        'high-contrast-text': 'var(--color-text-primary)',
        'high-contrast-text-secondary': 'var(--color-text-secondary)',
        'high-contrast-border': 'var(--color-border)',
      },
    },
  },
  plugins: [],
}
