/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'pms-bg-dark': '#121212', // Deep charcoal, almost black
        'pms-bg-light': '#1E1E1E', // Slightly lighter for cards/modals
        'pms-text-primary': '#FFFFFF',
        'pms-text-secondary': '#A0A0A0',
        'pms-accent-cyan': '#00FFFF',
        'pms-accent-pink': '#FF00FF',
        'pms-accent-error': '#FF4D4D',
        'pms-border': '#2A2A2A',
        'pms-accent-3': '#00A3FF',  // A slightly different blue for variety
        'pms-accent-3-hover': '#40C7FF',
      },
      boxShadow: {
        'glow-cyan': '0 0 15px 5px rgba(0, 255, 255, 0.2)',
        'glow-pink': '0 0 15px 5px rgba(255, 0, 255, 0.2)',
        'glow-white': '0 0 20px 5px rgba(255, 255, 255, 0.1)',
      }
    },
  },
  plugins: [],
};
