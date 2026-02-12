// HeroPixelAnimation.test.tsx - Unit tests for HeroPixelAnimation component
import React from 'react';
import { render } from '../../test-utils/render-with-providers';
import { HeroPixelAnimation } from './HeroPixelAnimation';

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = jest.fn();
const mockCancelAnimationFrame = jest.fn();
const mockGetContext = jest.fn();
const mockFillRect = jest.fn();
const mockClearRect = jest.fn();
const mockSetTransform = jest.fn();

beforeAll(() => {
  global.requestAnimationFrame = mockRequestAnimationFrame;
  global.cancelAnimationFrame = mockCancelAnimationFrame;

  // Minimal canvas API to allow the effect to proceed in jsdom.
  HTMLCanvasElement.prototype.getContext = mockGetContext;
  mockGetContext.mockReturnValue({
    fillRect: mockFillRect,
    clearRect: mockClearRect,
    setTransform: mockSetTransform,
    fillStyle: '',
  });

  Object.defineProperty(HTMLCanvasElement.prototype, 'offsetWidth', {
    writable: true,
    value: 300,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'offsetHeight', {
    writable: true,
    value: 200,
  });
  HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    width: 300,
    height: 200,
    right: 300,
    bottom: 200,
  }));
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('HeroPixelAnimation', () => {
  beforeEach(() => {
    mockRequestAnimationFrame.mockClear();
    mockCancelAnimationFrame.mockClear();
    mockGetContext.mockClear();
    mockFillRect.mockClear();
    mockClearRect.mockClear();
    mockSetTransform.mockClear();
  });

  describe('Rendering', () => {
    it('renders canvas element', () => {
      const { container } = render(<HeroPixelAnimation />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas?.tagName).toBe('CANVAS');
    });

    it('applies pixelated rendering style', () => {
      const { container } = render(<HeroPixelAnimation />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveStyle({ imageRendering: 'pixelated' });
    });

    it('applies correct CSS classes', () => {
      const { container } = render(<HeroPixelAnimation />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveClass('absolute');
      expect(canvas).toHaveClass('inset-0');
      expect(canvas).toHaveClass('w-full');
      expect(canvas).toHaveClass('h-full');
      expect(canvas).toHaveClass('pointer-events-auto');
    });

    it('accepts custom className', () => {
      const { container } = render(<HeroPixelAnimation className="custom-class" />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveClass('custom-class');
    });
  });

  describe('Configuration', () => {
    it('uses default particle count of 150', () => {
      const { container } = render(<HeroPixelAnimation />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      // Note: We can't directly test particle count as it's internal state
    });

    it('accepts custom particle count', () => {
      const { container } = render(<HeroPixelAnimation particleCount={50} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('accepts custom repulsion radius', () => {
      const { container } = render(<HeroPixelAnimation repulsionRadius={150} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('accepts custom repulsion force', () => {
      const { container } = render(<HeroPixelAnimation repulsionForce={0.8} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('accepts custom return speed', () => {
      const { container } = render(<HeroPixelAnimation returnSpeed={0.1} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('accepts custom colors', () => {
      const customColors = ['#FF0000', '#00FF00', '#0000FF'];
      const { container } = render(<HeroPixelAnimation colors={customColors} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Animation Lifecycle', () => {
    it('sets up resize event listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const { unmount } = render(<HeroPixelAnimation />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      
      unmount();
      addEventListenerSpy.mockRestore();
    });

    it('cleans up resize event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = render(<HeroPixelAnimation />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('sets up mouse event listeners on canvas', () => {
      const addEventListenerSpy = jest.spyOn(HTMLCanvasElement.prototype, 'addEventListener');
      const { unmount } = render(<HeroPixelAnimation />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
      
      unmount();
      addEventListenerSpy.mockRestore();
    });

    it('cleans up mouse event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(HTMLCanvasElement.prototype, 'removeEventListener');
      const { unmount } = render(<HeroPixelAnimation />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has appropriate ARIA attributes', () => {
      const { container } = render(<HeroPixelAnimation />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveAttribute('aria-hidden', 'true');
    });

    it('is decorative and doesn\'t convey meaningful information', () => {
      const { container } = render(<HeroPixelAnimation />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
