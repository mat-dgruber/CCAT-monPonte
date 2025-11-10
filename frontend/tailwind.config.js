/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-primary': '#18181B',
        'dark-secondary': '#27272A',
        'dark-panel-left': '#27272A',
        'dark-panel-middle': '#18181B',
        'dark-panel-right': '#27272A',
        'dark-accent': '#3B82F6',
        'dark-text': '#F4F4F5',
        'dark-text-secondary': '#A1A1AA',
        'dark-border': '#3F3F46',
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
