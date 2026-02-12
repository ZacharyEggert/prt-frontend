import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ev-white': '#ffffff',
        'ev-white-soft': '#f8f8f8',
        'ev-white-mute': '#f2f2f2',
        'ev-black': '#1b1b1f',
        'ev-black-soft': '#222222',
        'ev-black-mute': '#282828',
        'ev-gray-1': '#515c67',
        'ev-gray-2': '#414853',
        'ev-gray-3': '#32363f',
        'ev-text-1': 'rgba(255, 255, 245, 0.86)',
        'ev-text-2': 'rgba(235, 235, 245, 0.6)',
        'ev-text-3': 'rgba(235, 235, 245, 0.38)'
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif'
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace'
        ]
      }
    }
  },
  plugins: []
} satisfies Config
