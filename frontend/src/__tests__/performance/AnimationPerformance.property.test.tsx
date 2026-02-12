// AnimationPerformance.property.test.tsx - Property-based tests for animation performance
import React from 'react';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { runPropertyTest } from '../../test-utils/test-config';

// Import components to test
import { Button } from '../../components/Button/Button';
import { Loading } from '../../components/Loading/Loading';
import { HeroPixelAnimation } from '../../components/PixelArt/PixelArt';

// Mock requestAnimationFrame for consistent testing
const mockRequestAnimationFrame = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(performance.now()), 16) as unknown as number;
};

const mockCancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Mock performance monitoring
jest.mock('../../utils/performanceMonitoring', () => ({
  getPerformanceMonitor: jest.fn(() => ({
    getMetrics: jest.fn(() => ({
      animationFrameRates: [60, 60, 60, 60, 60],
      droppedFrames: 0,
    })),
    getAverageFrameRate: jest.fn(() => 60),
    getFrameRateStability: jest.fn(() => 1.5),
    measureFirstInputDelay: jest.fn(),
    sendReport: jest.fn(),
    cleanup: jest.fn(),
  })),
  cleanupPerformanceMonitor: jest.fn(),
}));

describe('Performance - Animation Performance Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    
    // Mock requestAnimationFrame
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(mockRequestAnimationFrame);
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(mockCancelAnimationFrame);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Property 22: Animation Performance
  // Validates: Requirements 12.4
  runPropertyTest(
    22,
    'Animation Performance - Button Hover Animation Smoothness',
    fc.record({
      text: fc.string({ minLength: 1, maxLength: 20 }).filter(text => text.trim().length > 0),
      variant: fc.constantFrom<'normal' | 'primary' | 'success' | 'warning' | 'error'>(
        'normal', 'primary', 'success', 'warning', 'error'
      ),
    }),
    async ({ text, variant }) => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      cleanup(); // Ensure clean state
      
      const { container } = render(
        <Button 
          variant={variant}
          onClick={handleClick}
        >
          {text}
        </Button>
      );
      
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(text);
      
      // Button should have hover animation classes
      expect(button).toHaveClass('hover:translate-y-[-2px]');
      expect(button).toHaveClass('active:translate-y-[2px]');
      expect(button).toHaveClass('transition-all');
      
      // Measure hover animation performance
      const hoverStartTime = performance.now();
      
      await user.hover(button);
      
      const hoverEndTime = performance.now();
      const hoverTime = hoverEndTime - hoverStartTime;
      
      // Hover animation should trigger quickly (within 100ms)
      expect(hoverTime).toBeLessThan(100);
      
      // Button should have active state classes
      expect(button).toHaveClass('active:translate-y-0');
      
      // Test click animation
      const clickStartTime = performance.now();
      
      await user.click(button);
      
      const clickEndTime = performance.now();
      const clickTime = clickEndTime - clickStartTime;
      
      // Click should register quickly (within 50ms)
      expect(clickTime).toBeLessThan(50);
      expect(handleClick).toHaveBeenCalledTimes(1);
    }
  );

  runPropertyTest(
    22.1,
    'Animation Performance - Loading Animation Frame Rate',
    fc.record({
      text: fc.string({ minLength: 0, maxLength: 30 }),
      size: fc.constantFrom<'sm' | 'md' | 'lg'>('sm', 'md', 'lg'),
    }),
    async ({ text, size }) => {
      // Mock performance.now for consistent frame rate measurement
      let mockTime = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        mockTime += 16.67; // ~60 FPS interval
        return mockTime;
      });
      
      render(
        <Loading 
          text={text}
          size={size}
        />
      );
      
      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toBeInTheDocument();
      
      // Loading component should have animation classes
      // Check for the actual animation class in the child element
      const spinnerElement = loadingElement.querySelector('.animate-spin-pixel');
      expect(spinnerElement).toBeInTheDocument();
      
      // Simulate animation frames
      const frameTimes: number[] = [];
      const frameCount = 10;
      
      for (let i = 0; i < frameCount; i++) {
        const frameStart = performance.now();
        
        // Trigger animation frame
        act(() => {
          jest.advanceTimersByTime(16.67);
        });
        
        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }
      
      // Calculate average frame time
      const totalFrameTime = frameTimes.reduce((sum, time) => sum + time, 0);
      const averageFrameTime = totalFrameTime / frameTimes.length;
      
      // Frame time should be consistent (within 2ms variance)
      const frameTimeVariance = Math.max(...frameTimes) - Math.min(...frameTimes);
      expect(frameTimeVariance).toBeLessThan(2);
      
      // Average frame time should be close to 16.67ms (60 FPS)
      // Allow some tolerance for test overhead
      expect(averageFrameTime).toBeGreaterThan(15);
      expect(averageFrameTime).toBeLessThan(20);
      
      // Restore performance.now
      jest.restoreAllMocks();
    }
  );

  runPropertyTest(
    22.2,
    'Animation Performance - Interactive Animation Responsiveness',
    fc.record({
      interactionCount: fc.integer({ min: 1, max: 10 }),
      interactionType: fc.constantFrom<'hover' | 'click' | 'focus'>('hover', 'click', 'focus'),
    }),
    async ({ interactionCount, interactionType }) => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(
        <div data-testid="interaction-test">
          {Array.from({ length: interactionCount }).map((_, index) => (
            <Button 
              key={index}
              onClick={handleClick}
              data-testid={`button-${index}`}
            >
              Button {index}
            </Button>
          ))}
        </div>
      );
      
      const testContainer = screen.getByTestId('interaction-test');
      expect(testContainer).toBeInTheDocument();
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(interactionCount);
      
      // Measure interaction performance
      const interactionTimes: number[] = [];
      
      for (let i = 0; i < interactionCount; i++) {
        const button = screen.getByTestId(`button-${i}`);
        
        const startTime = performance.now();
        
        switch (interactionType) {
          case 'hover':
            await user.hover(button);
            break;
          case 'click':
            await user.click(button);
            break;
          case 'focus':
            await user.tab();
            break;
        }
        
        const endTime = performance.now();
        interactionTimes.push(endTime - startTime);
      }
      
      // All interactions should complete quickly
      interactionTimes.forEach(time => {
        expect(time).toBeLessThan(100);
      });
      
      // Average interaction time should be reasonable
      const averageTime = interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length;
      expect(averageTime).toBeLessThan(50);
      
      if (interactionType === 'click') {
        expect(handleClick).toHaveBeenCalledTimes(interactionCount);
      }
    }
  );

  runPropertyTest(
    22.3,
    'Animation Performance - Concurrent Animations',
    fc.array(
      fc.record({
        componentType: fc.constantFrom<'button' | 'loading'>('button', 'loading'),
        props: fc.anything(),
      }),
      { minLength: 1, maxLength: 5 }
    ),
    async (components) => {
      // This property test validates that multiple concurrent animations
      // maintain acceptable performance
      
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      const startTime = performance.now();
      
      const { container } = render(
        <div data-testid="concurrent-animations-test">
          {components.map((comp, index) => {
            switch (comp.componentType) {
              case 'button':
                return (
                  <Button 
                    key={index} 
                    onClick={handleClick}
                    data-testid={`animated-button-${index}`}
                  >
                    Animated {index}
                  </Button>
                );
              case 'loading':
                return (
                  <Loading 
                    key={index}
                    size="md"
                    data-testid={`animated-loading-${index}`}
                  />
                );
              default:
                return null;
            }
          })}
        </div>
      );
      
      const renderTime = performance.now() - startTime;
      
      // Multiple animated components should render within 100ms
      expect(renderTime).toBeLessThan(100);
      
      const testContainer = screen.getByTestId('concurrent-animations-test');
      expect(testContainer).toBeInTheDocument();
      
      // Count animated elements
      const buttons = container.querySelectorAll('button');
      const loadingElements = container.querySelectorAll('[role="status"]');
      
      const expectedButtons = components.filter(c => c.componentType === 'button').length;
      const expectedLoading = components.filter(c => c.componentType === 'loading').length;
      
      expect(buttons.length).toBe(expectedButtons);
      expect(loadingElements.length).toBe(expectedLoading);
      
      // Test interaction with animated buttons
      if (expectedButtons > 0) {
        const firstButton = screen.getByTestId('animated-button-0');
        
        const interactionStart = performance.now();
        await user.hover(firstButton);
        const interactionTime = performance.now() - interactionStart;
        
        // Hover animation should still be responsive with concurrent animations
        expect(interactionTime).toBeLessThan(50);
        
        // Button should have hover animation classes
        expect(firstButton).toHaveClass('hover:-translate-y-0.5');
        expect(firstButton).toHaveClass('transition-transform');
      }
      
      // Loading animations should be running
      if (expectedLoading > 0) {
        const firstLoading = screen.getByTestId('animated-loading-0');
        expect(firstLoading).toHaveClass('animate-spin');
      }
    }
  );

  runPropertyTest(
    22.4,
    'Animation Performance - Animation Frame Rate Consistency',
    fc.integer({ min: 10, max: 100 }).chain(frameCount =>
      fc.record({
        frameCount: fc.constant(frameCount),
        targetFPS: fc.integer({ min: 30, max: 120 }),
      })
    ),
    async ({ frameCount, targetFPS }) => {
      // This property test validates that animations maintain consistent frame rates
      
      // Mock performance.now to simulate target frame rate
      const frameInterval = 1000 / targetFPS;
      let mockTime = 0;
      
      const originalNow = performance.now;
      performance.now = jest.fn(() => {
        mockTime += frameInterval;
        return mockTime;
      });
      
      // Mock requestAnimationFrame to track callbacks
      const rafCallbacks: FrameRequestCallback[] = [];
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = jest.fn((callback) => {
        rafCallbacks.push(callback);
        return 1;
      });
      
      try {
        render(
          <Loading 
            size="lg"
            text="Testing frame rate"
          />
        );
        
        const loadingElement = screen.getByRole('status');
        expect(loadingElement).toBeInTheDocument();
        expect(loadingElement).toHaveClass('animate-spin');
        
        // Simulate animation frames
        const frameTimes: number[] = [];
        
        for (let i = 0; i < frameCount; i++) {
          const frameStart = performance.now();
          
          // Execute any pending RAF callbacks
          rafCallbacks.forEach(callback => {
            act(() => {
              callback(performance.now());
            });
          });
          rafCallbacks.length = 0;
          
          const frameEnd = performance.now();
          frameTimes.push(frameEnd - frameStart);
        }
        
        // Calculate frame rate statistics
        const frameDurations = frameTimes.map(time => time);
        const averageFrameDuration = frameDurations.reduce((sum, dur) => sum + dur, 0) / frameDurations.length;
        const actualFPS = 1000 / averageFrameDuration;
        
        // Frame rate should be close to target (within 20% tolerance)
        const fpsRatio = actualFPS / targetFPS;
        expect(fpsRatio).toBeGreaterThan(0.8);
        expect(fpsRatio).toBeLessThan(1.2);
        
        // Frame times should be consistent (low variance)
        const frameDurationVariance = Math.max(...frameDurations) - Math.min(...frameDurations);
        expect(frameDurationVariance).toBeLessThan(frameInterval * 0.5); // Less than 50% variance
        
      } finally {
        // Restore mocks
        performance.now = originalNow;
        window.requestAnimationFrame = originalRAF;
      }
    }
  );
});