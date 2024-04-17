import { type Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

export default {
  content: ['./src/**/*.tsx'],
  theme: {
    extend: {
      animation: {
        'text-wipe': 'text-wipe 0.5s cubic-bezier(.42,.19,.59,.96) forwards',
      },
      backgroundImage: {
        shine:
          // 'linear-gradient(top left, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 37%, rgba(255, 255, 255, 0.8) 45%, rgba(255, 255, 255, 0.0) 50%)',
          'linear-gradient(red 0%, orange 25%, yellow 50%, green 75%, blue 100%)',
      },
      boxShadow: {
        container: '-15px 17px 17px rgba(10, 10, 10, 0.25)',
      },
      colors: {
        green: {
          '04f504': '#04f504',
        },
        blue: {
          '08e2ff': '#08e2ff',
        },
        yellow: {
          ffc404: '#ffc404',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
      keyframes: {
        'text-wipe': {
          '0%': { opacity: '1', width: '0' },
          '100%': { opacity: '1', width: '100%' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
