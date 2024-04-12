/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      backgroundColor: {
        gradient: 'linear-gradient(var(--gray-gradient)) no-repeat',
      },
    },
  },
  plugins: [],
}
