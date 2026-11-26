import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        clay: {
          50: '#fdf8f3',
          100: '#faf0e6',
          200: '#f3dcc9',
          300: '#e8c0a0',
          400: '#d99d70',
          500: '#c97a48',
          600: '#b56137',
          700: '#944d2d',
          800: '#773f2a',
          900: '#613525',
          950: '#331a12',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config