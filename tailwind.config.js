/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f0f0f',
          surface: '#1a1a1a',
          card: '#262626',
        },
        accent: {
          primary: '#22d3ee',   
          secondary: '#a78bfa', 
          tertiary: '#fb7185',  
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        tank: {
          full: '#10b981',
          medium: '#f59e0b', 
          low: '#ef4444',
          empty: '#6b7280'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glimmer': 'glimmer 2s ease-in-out infinite',
      },
      keyframes: {
        glimmer: {
          '0%, 100%': {
            borderColor: 'rgba(34, 211, 238, 0.3)',
            boxShadow: '0 0 5px rgba(34, 211, 238, 0.2)'
          },
          '50%': {
            borderColor: 'rgba(34, 211, 238, 0.8)',
            boxShadow: '0 0 15px rgba(34, 211, 238, 0.5)'
          },
        }
      }
    },
  },
  plugins: [],
}