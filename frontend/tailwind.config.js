/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vscode-bg': '#050B18',
        'vscode-panel': '#0F172A',
        'vscode-sidebar': '#080C14',
        'vscode-border': 'rgba(255, 255, 255, 0.06)',
        'vscode-text': '#CBD5E1',
        'vscode-accent': '#3B82F6',
        'land-bg': '#050B18',
        'land-card': 'rgba(15, 23, 42, 0.65)',
        'land-border': 'rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)' },
        }
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.8s ease both',
        'gradient-shift': 'gradient-shift 8s linear infinite',
        'float': 'float 5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.25)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.25)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.25)',
        'elevated': '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(var(--tw-gradient-stops))',
        'conic-gradient': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
