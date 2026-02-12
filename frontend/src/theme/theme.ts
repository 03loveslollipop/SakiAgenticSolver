// theme.ts - 8-bit Design System Theme Configuration
export const theme = {
  colors: {
    primary: {
      yellow: '#DBC70F',
      yellowHsl: 'hsla(54, 87%, 45%, 1)',
    },
    accent: {
      pink: '#DB6495',
      pinkHsl: 'hsla(335, 62%, 62%, 1)',
      cyan: '#1ABBDB',
      cyanHsl: 'hsla(189, 78%, 48%, 1)',
    },
    neutral: {
      teal: '#3D7A86',
      tealHsl: 'hsla(189, 37%, 38%, 1)',
      olive: '#5C593E',
      oliveHsl: 'hsla(54, 19%, 30%, 1)',
      darkPurple: '#5C3947',
      darkPurpleHsl: 'hsla(335, 23%, 29%, 1)',
    },
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  typography: {
    fontFamily: {
      pixel: '"Press Start 2P", "DotGothic16", "Courier New", monospace',
    },
    fontSize: {
      xs: '8px',
      sm: '10px',
      base: '12px',
      lg: '16px',
      xl: '20px',
      xxl: '24px',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.8,
    },
  },
  
  borders: {
    pixel: {
      width: '4px',
      style: 'solid',
      radius: '0px', // No border radius for pixel aesthetic
    },
  },
  
  breakpoints: {
    mobile: '0px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
  },
  
  shadows: {
    pixel: '4px 4px 0px rgba(0, 0, 0, 0.25)',
    pixelLarge: '8px 8px 0px rgba(0, 0, 0, 0.25)',
  },
} as const;

export type Theme = typeof theme;
