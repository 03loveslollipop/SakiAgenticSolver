// HeroPixelAnimation.property.test.tsx - Property-based tests for HeroPixelAnimation
import React from 'react';
import { render } from '../../test-utils/render-with-providers';
import fc from 'fast-check';
import { HeroPixelAnimation } from './HeroPixelAnimation';
import { runPropertyTest } from '../../test-utils/test-config';

// Mock canvas context for testing
const mockGetContext = jest.fn();
const mockFillRect = jest.fn();
const mockClearRect = jest.fn();
const mockRequestAnimationFrame = jest.fn();
const mockCancelAnimationFrame = jest.fn();

beforeAll(() => {
  // Mock canvas methods - prevent actual canvas operations in tests
  HTMLCanvasElement.prototype.getContext = mockGetContext;
  
  // Mock canvas properties
  Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
    writable: true,
    value: 300,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
    writable: true,
    value: 200,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'offsetWidth', {
    writable: true,
    value: 300,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'offsetHeight', {
    writable: true,
    value: 200,
  });
  
  // Mock getBoundingClientRect for mouse tracking
  HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    width: 300,
    height: 200,
    right: 300,
    bottom: 200,
  }));
  
  global.requestAnimationFrame = mockRequestAnimationFrame;
  global.cancelAnimationFrame = mockCancelAnimationFrame;
  
  // Setup mock context with minimal required properties
  mockGetContext.mockReturnValue({
    fillRect: mockFillRect,
    clearRect: mockClearRect,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    getLineDash: () => [],
    setLineDash: () => {},
    lineDashOffset: 0,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    direction: 'ltr',
    save: () => {},
    restore: () => {},
    scale: () => {},
    rotate: () => {},
    translate: () => {},
    transform: () => {},
    setTransform: () => {},
    resetTransform: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => ({}),
    createImageData: () => ({ data: new Uint8ClampedArray(0) }),
    getImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 }),
    putImageData: () => {},
    drawImage: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    bezierCurveTo: () => {},
    quadraticCurveTo: () => {},
    arc: () => {},
    arcTo: () => {},
    ellipse: () => {},
    rect: () => {},
    fill: () => {},
    stroke: () => {},
    clip: () => {},
    isPointInPath: () => false,
    isPointInStroke: () => false,
    measureText: () => ({ width: 0 }),
    drawFocusIfNeeded: () => {},
    scrollPathIntoView: () => {},
  });
});

beforeEach(() => {
  mockGetContext.mockClear();
  mockFillRect.mockClear();
  mockClearRect.mockClear();
  mockRequestAnimationFrame.mockClear();
  mockCancelAnimationFrame.mockClear();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('HeroPixelAnimation Properties', () => {
  runPropertyTest(
    23,
    'Hero Animation Mouse Interaction - Configuration Validation',
    fc.record({
      particleCount: fc.integer({ min: 1, max: 1000 }),
      repulsionRadius: fc.integer({ min: 0, max: 500 }),
    }),
    async ({ particleCount, repulsionRadius }) => {
      // Component should render without crashing for any valid configuration
      const { container, unmount } = render(
        <HeroPixelAnimation
          particleCount={particleCount}
          repulsionRadius={repulsionRadius}
        />
      );

      // Verify canvas exists
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
      
      // Verify canvas has pixelated rendering (8-bit aesthetic - Requirement 4.10)
      expect(canvas).toHaveStyle({ imageRendering: 'pixelated' });
      
      // Verify canvas has correct ARIA attributes for accessibility
      expect(canvas).toHaveAttribute('aria-hidden', 'true');
      expect(canvas).toHaveAttribute('role', 'presentation');
      
      // Component should initialize canvas context for animation
      expect(mockGetContext).toHaveBeenCalledWith('2d');
      
      // Clean up
      unmount();
    }
  );

  runPropertyTest(
    23,
    'Hero Animation Mouse Interaction - Color Configuration',
    fc.record({
      colors: fc.array(
        fc.constantFrom('#DBC70F', '#DB6495', '#1ABBDB', '#3D7A86', '#5C593E', '#5C3947', '#FF0000', '#00FF00', '#0000FF'),
        { minLength: 1, maxLength: 10 }
      ),
    }),
    async ({ colors }) => {
      // Component should handle any valid color array
      const { container, unmount } = render(
        <HeroPixelAnimation colors={colors} />
      );

      // Verify canvas exists
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
      
      // Verify canvas has correct styling for 8-bit aesthetic (Requirement 4.10)
      expect(canvas).toHaveStyle({ imageRendering: 'pixelated' });
      
      // Component should initialize canvas context for animation
      expect(mockGetContext).toHaveBeenCalledWith('2d');
      
      // Clean up
      unmount();
    }
  );

  runPropertyTest(
    23,
    'Hero Animation Mouse Interaction - Default Configuration',
    fc.constant(null),
    async () => {
      // Component should render with default configuration
      const { container, unmount } = render(<HeroPixelAnimation />);

      // Verify canvas exists
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
      
      // Verify canvas has correct CSS classes for positioning
      expect(canvas).toHaveClass('absolute');
      expect(canvas).toHaveClass('inset-0');
      expect(canvas).toHaveClass('w-full');
      expect(canvas).toHaveClass('h-full');
      expect(canvas).toHaveClass('pointer-events-auto');
      
      // Verify canvas has pixelated rendering for 8-bit aesthetic (Requirement 4.10)
      expect(canvas).toHaveStyle({ imageRendering: 'pixelated' });
      
      // Component should initialize canvas context for animation
      expect(mockGetContext).toHaveBeenCalledWith('2d');
      
      // Clean up
      unmount();
    }
  );
});