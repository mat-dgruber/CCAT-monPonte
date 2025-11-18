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
  plugins: [
    require('tailwindcss-themer')({
      defaultTheme: {
        extend: {
          colors: {
            'primary': '#18181B',
            'secondary': '#27272A',
            'accent': '#3B82F6',
            'neutral': '#3F3F46',
            'background': '#FFFFFF',
            'text': '#18181B',
            'success': '#22C55E',
            'error': '#EF4444',
            'warning': '#F97316',
          }
        }
      },
      themes: [
        {
          name: 'dark',
          extend: {
            colors: {
              'primary': '#18181B',
              'secondary': '#27272A',
              'accent': '#3B82F6',
              'neutral': '#3F3F46',
              'background': '#18181B',
              'text': '#F4F4F5',
            }
          }
        },
        {
          name: 'capycro',
          extend: {
            colors: {
              'primary': '#5d8a8c',
              'secondary': '#d8704c',
              'accent': '#f0a040',
              'neutral': '#b0b0b0',
              'background': '#fbf9f6',
              'text': '#3a3a3a',
              'success': '#5a9261',
              'error': '#d15c5c',
              'warning': '#e6a700',
            }
          }
        }
      ]
    })
  ],
}
