/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        editorial: {
          pink: '#dfb2b2',
          pinkHover: '#d4a2a2',
          pinkLight: '#ebd2d2',
          pinkDark: '#b88989',
          ink: '#111111',
          inkMuted: '#333333',
          border: 'rgba(17, 17, 17, 0.25)',
          borderHeavy: '#111111',
          paper: '#e8c4c4',
        },
      },
      fontFamily: {
        editorial: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      letterSpacing: {
        'ultra-wide': '0.35em',
        'editorial-tight': '-0.06em',
      },
      animation: {
        'dash-flow': 'dash 20s linear infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
      },
      keyframes: {
        dash: {
          to: {
            strokeDashoffset: '-1000',
          },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};
