/**
 * Test to verify Tailwind CSS configuration with 8-bit theme
 * This test ensures that the custom theme values are properly configured
 */

const tailwindConfig = require('../../tailwind.config');
const resolveConfig = require('tailwindcss/resolveConfig');

describe('Tailwind CSS 8-bit Theme Configuration', () => {
  const fullConfig = resolveConfig(tailwindConfig);

  test('should have custom 8-bit color palette defined', () => {
    const colors = fullConfig.theme.colors;
    
    // Primary colors
    expect(colors.primary.yellow).toBe('#DBC70F');
    
    // Accent colors
    expect(colors.accent.pink).toBe('#DB6495');
    expect(colors.accent.cyan).toBe('#1ABBDB');
    
    // Neutral colors
    expect(colors.neutral.teal).toBe('#3D7A86');
    expect(colors.neutral.olive).toBe('#5C593E');
    expect(colors.neutral.darkPurple).toBe('#5C3947');
  });

  test('should have Press Start 2P pixel font configured', () => {
    const fontFamily = fullConfig.theme.fontFamily;
    
    expect(fontFamily.pixel).toBeDefined();
    expect(fontFamily.pixel[0]).toBe('"Press Start 2P"');
  });

  test('should have custom 8-bit font sizes', () => {
    const fontSize = fullConfig.theme.fontSize;
    
    // Tailwind resolves fontSize as [size, lineHeight] tuples or just size strings
    // Check if the values are correct (may be strings or arrays)
    const getFontSize = (size: any) => Array.isArray(size) ? size[0] : size;
    
    expect(getFontSize(fontSize.xs)).toBe('8px');
    expect(getFontSize(fontSize.sm)).toBe('10px');
    expect(getFontSize(fontSize.base)).toBe('12px');
    expect(getFontSize(fontSize.lg)).toBe('16px');
    expect(getFontSize(fontSize.xl)).toBe('20px');
    expect(getFontSize(fontSize['2xl'])).toBe('24px');
  });

  test('should have custom spacing scale', () => {
    const spacing = fullConfig.theme.spacing;
    
    expect(spacing.xs).toBe('4px');
    expect(spacing.sm).toBe('8px');
    expect(spacing.md).toBe('16px');
    expect(spacing.lg).toBe('24px');
    expect(spacing.xl).toBe('32px');
    expect(spacing['2xl']).toBe('48px');
  });

  test('should have 4px default border width for pixel aesthetic', () => {
    const borderWidth = fullConfig.theme.borderWidth;
    
    expect(borderWidth.DEFAULT).toBe('4px');
    expect(borderWidth['4']).toBe('4px');
  });

  test('should have no border radius for pixel aesthetic', () => {
    const borderRadius = fullConfig.theme.borderRadius;
    
    expect(borderRadius.none).toBe('0px');
    expect(borderRadius.DEFAULT).toBe('0px');
  });

  test('should have pixel-style box shadows', () => {
    const boxShadow = fullConfig.theme.boxShadow;
    
    expect(boxShadow.pixel).toBe('4px 4px 0px rgba(0, 0, 0, 0.25)');
    expect(boxShadow['pixel-lg']).toBe('8px 8px 0px rgba(0, 0, 0, 0.25)');
  });

  test('should have responsive breakpoints configured', () => {
    const screens = fullConfig.theme.screens;
    
    expect(screens.mobile).toBe('0px');
    expect(screens.tablet).toBe('768px');
    expect(screens.desktop).toBe('1024px');
    expect(screens.wide).toBe('1440px');
  });

  test('should have 8-bit animation keyframes', () => {
    const keyframes = fullConfig.theme.keyframes;
    
    expect(keyframes['spin-pixel']).toBeDefined();
    expect(keyframes['spin-pixel']['0%']).toEqual({ transform: 'rotate(0deg)' });
    expect(keyframes['spin-pixel']['100%']).toEqual({ transform: 'rotate(360deg)' });
  });

  test('should have pixel animation with steps timing', () => {
    const animation = fullConfig.theme.animation;
    
    expect(animation['spin-pixel']).toBe('spin-pixel 1s steps(8) infinite');
  });
});
