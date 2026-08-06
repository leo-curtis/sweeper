/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        light: {
          bg: '#ffffff',
          surface: '#f5f5f5',
          border: '#e0e0e0',
          text: '#222222',
          accent: '#0066cc',
        },
        dark: {
          bg: '#1a1a1a',
          surface: '#2d2d2d',
          border: '#444444',
          text: '#ffffff',
          accent: '#00d9ff',
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};
