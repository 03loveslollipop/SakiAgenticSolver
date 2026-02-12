/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          yellow: '#DBC70F',
        },
        accent: {
          pink: '#DB6495',
          cyan: '#1ABBDB',
        },
        neutral: {
          teal: '#3D7A86',
          olive: '#5C593E',
          darkPurple: '#5C3947',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', '"Courier New"', 'monospace'],
      },
      fontSize: {
        xs: '10px',
        sm: '12px',
        base: '14px',
        lg: '18px',
        xl: '24px',
        '2xl': '30px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      borderWidth: {
        DEFAULT: '4px',
        '0': '0',
        '2': '2px',
        '4': '4px',
        '8': '8px',
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
      },
      boxShadow: {
        pixel: '4px 4px 0px rgba(0, 0, 0, 0.25)',
        'pixel-lg': '8px 8px 0px rgba(0, 0, 0, 0.25)',
      },
      lineHeight: {
        tight: '1.2',
        normal: '1.5',
        relaxed: '1.8',
      },
      keyframes: {
        'spin-pixel': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'spin-pixel': 'spin-pixel 1s steps(8) infinite',
      },
    },
    screens: {
      mobile: '0px',
      tablet: '768px',
      desktop: '1024px',
      wide: '1440px',
    },
  },
  plugins: [],
};
