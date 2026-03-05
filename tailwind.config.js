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
        // === iOS System Colors ===
        'ios-blue':       '#007AFF',
        'ios-green':      '#34C759',
        'ios-red':        '#FF3B30',
        'ios-orange':     '#FF9500',
        'ios-purple':     '#AF52DE',
        'ios-bg':         '#F2F2F7',   // iOS systemGroupedBackground
        'ios-card':       '#FFFFFF',
        'ios-label':      '#000000',
        'ios-secondary':  '#8E8E93',
        'ios-tertiary':   '#C7C7CC',
        'ios-separator':  'rgba(60,60,67,0.29)',

        // === 旧ダークテーマ（WorkoutForm等で使用中） ===
        'pms-bg-dark':          '#121212',
        'pms-bg-light':         '#1E1E1E',
        'pms-text-primary':     '#FFFFFF',
        'pms-text-secondary':   '#A0A0A0',
        'pms-accent-cyan':      '#00FFFF',
        'pms-accent-pink':      '#FF00FF',
        'pms-accent-error':     '#FF4D4D',
        'pms-border':           '#2A2A2A',
        'pms-accent-3':         '#00A3FF',
        'pms-accent-3-hover':   '#40C7FF',
      },
      boxShadow: {
        'ios-sm':  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'ios-md':  '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        'ios-lg':  '0 8px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        'ios-fab': '0 4px 20px rgba(0,122,255,0.40)',
        // 旧テーマ用
        'glow-cyan':  '0 0 15px 5px rgba(0,255,255,0.2)',
        'glow-pink':  '0 0 15px 5px rgba(255,0,255,0.2)',
        'glow-white': '0 0 20px 5px rgba(255,255,255,0.1)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
