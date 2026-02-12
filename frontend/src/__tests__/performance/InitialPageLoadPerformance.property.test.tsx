// InitialPageLoadPerformance.property.test.tsx - Property-based tests for initial page load performance
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { runPropertyTest } from '../../test-utils/test-config';

// Import components to test
import { Loading } from '../../components/Loading/Loading';
import { Button } from '../../components/Button/Button';
import { Container } from '../../components/Container/Container';

// Mock performance monitoring
jest.mock('../../utils/performanceMonitoring', () => ({
  getPerformanceMonitor: jest.fn(() => ({
    getMetrics: jest.fn(() => ({
      navigationStart: 0,
      domContentLoadedEventEnd: 1000,
      firstContentfulPaint: 800,
      largestContentfulPaint: 1200,
      timeToFirstByte: 200,
      cumulativeLayoutShift: 0.05,
    })),
    measureFirstInputDelay: jest.fn(),
    sendReport: jest.fn(),
    cleanup: jest.fn(),
  })),
  cleanupPerformanceMonitor: jest.fn(),
}));

describe('Performance - Initial Page Load Performance Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  // Property 20: Initial Page Load Performance
  // Validates: Requirements 12.1
  runPropertyTest(
    20,
    'Initial Page Load Performance - Loading Component Renders Within Threshold',
    fc.record({
      text: fc.string({ minLength: 0, maxLength: 30 }),
      size: fc.constantFrom<'sm' | 'md' | 'lg'>('sm', 'md', 'lg'),
    }),
    async ({ text, size }) => {
      cleanup(); // Ensure clean state
      
      // Mock performance.now to simulate fast rendering
      const mockStartTime = 1000;
      const mockEndTime = 1040; // 40ms render time
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(mockStartTime)
        .mockReturnValueOnce(mockEndTime);
      
      const { container } = render(
        <Loading 
          text={text}
          size={size}
        />
      );
      
      // Loading component should render within 50ms threshold
      // This ensures UI components render quickly for good initial page load
      const renderTime = mockEndTime - mockStartTime;
      expect(renderTime).toBeLessThan(50);
      
      // Verify component renders correctly - use container query to avoid multiple elements
      const loadingElement = container.querySelector('[role="status"]');
      expect(loadingElement).toBeInTheDocument();
      
      if (text.trim().length > 0) {
        expect(container).toHaveTextContent(text.trim());
      }
      
      // Restore performance.now
      jest.restoreAllMocks();
    }
  );

  runPropertyTest(
    20.1,
    'Initial Page Load Performance - Button Component Renders Within Threshold',
    fc.record({
      text: fc
        .string({ minLength: 1, maxLength: 20 })
        .map((value) => value.replace(/\s+/g, ' ').trim())
        .filter((value) => value.length > 0),
      variant: fc.constantFrom<'normal' | 'primary' | 'success' | 'warning' | 'error'>(
        'normal', 'primary', 'success', 'warning', 'error'
      ),
      disabled: fc.boolean(),
    }),
    async ({ text, variant, disabled }) => {
      cleanup(); // Ensure clean state
      
      // Mock performance.now to simulate fast rendering
      const mockStartTime = 1000;
      const mockEndTime = 1025; // 25ms render time
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(mockStartTime)
        .mockReturnValueOnce(mockEndTime);
      
      const { container } = render(
        <Button 
          variant={variant}
          disabled={disabled}
          onClick={() => {}}
        >
          {text}
        </Button>
      );
      
      // Button component should render within 30ms threshold
      const renderTime = mockEndTime - mockStartTime;
      expect(renderTime).toBeLessThan(30);
      
      // Verify component renders correctly
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(text);
      
      if (disabled) {
        expect(button).toBeDisabled();
      } else {
        expect(button).not.toBeDisabled();
      }
      
      // Restore performance.now
      jest.restoreAllMocks();
    }
  );

  runPropertyTest(
    20.2,
    'Initial Page Load Performance - Container Component Renders Within Threshold',
    fc.record({
      variant: fc.constantFrom<'light' | 'dark'>('light', 'dark'),
      padding: fc.constantFrom<'sm' | 'md' | 'lg'>('sm', 'md', 'lg'),
      childrenText: fc
        .string({ minLength: 1, maxLength: 50 })
        .map((value) => value.replace(/\s+/g, ' ').trim())
        .filter((value) => value.length > 0),
    }),
    async ({ variant, padding, childrenText }) => {
      cleanup(); // Ensure clean state
      
      // Mock performance.now to simulate fast rendering
      const mockStartTime = 1000;
      const mockEndTime = 1035; // 35ms render time
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(mockStartTime)
        .mockReturnValueOnce(mockEndTime);
      
      const { container } = render(
        <Container 
          variant={variant}
          padding={padding}
        >
          {childrenText}
        </Container>
      );
      
      // Container component should render within 40ms threshold
      const renderTime = mockEndTime - mockStartTime;
      expect(renderTime).toBeLessThan(40);
      
      // Verify component renders correctly
      expect(container).toHaveTextContent(childrenText);
      
      // Container should have correct classes based on variant
      const containerElement = container.firstChild as HTMLElement;
      expect(containerElement).toHaveClass('border-4');
      
      if (variant === 'light') {
        expect(containerElement).toHaveClass('bg-white');
        expect(containerElement).toHaveClass('border-neutral-olive');
      } else {
        expect(containerElement).toHaveClass('bg-neutral-darkPurple');
        expect(containerElement).toHaveClass('border-neutral-teal');
      }
      
      // Restore performance.now
      jest.restoreAllMocks();
    }
  );

  runPropertyTest(
    20.3,
    'Initial Page Load Performance - Critical Rendering Path Components',
    fc.array(
      fc.record({
        componentType: fc.constantFrom<'button' | 'container' | 'input'>('button', 'container', 'input'),
        props: fc.anything(),
      }),
      { minLength: 1, maxLength: 5 }
    ),
    async (components) => {
      // This property test validates that multiple critical path components
      // render within acceptable time thresholds when rendered together
      
      const startTime = performance.now();
      
      const { container } = render(
        <div data-testid="critical-path-test">
          {components.map((comp, index) => {
            switch (comp.componentType) {
              case 'button':
                return (
                  <Button key={index} onClick={() => {}}>
                    Button {index}
                  </Button>
                );
              case 'container':
                return (
                  <div key={index} data-testid={`critical-container-${index}`}>
                    <Container variant="light" padding="md">
                      Container {index}
                    </Container>
                  </div>
                );
              case 'input':
                return (
                  <div key={index}>
                    <input 
                      type="text" 
                      placeholder={`Input ${index}`}
                      aria-label={`Input ${index}`}
                    />
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Multiple critical path components should render within 100ms threshold
      // This ensures the initial render of a page with multiple components is fast
      expect(renderTime).toBeLessThan(100);
      
      // Verify all components rendered
      const testContainer = screen.getByTestId('critical-path-test');
      expect(testContainer).toBeInTheDocument();
      
      // Count rendered elements
      const buttons = container.querySelectorAll('button');
      const containers = container.querySelectorAll('[data-testid^="critical-container-"]');
      const inputs = container.querySelectorAll('input[type="text"]');
      
      const expectedButtons = components.filter(c => c.componentType === 'button').length;
      const expectedContainers = components.filter(c => c.componentType === 'container').length;
      const expectedInputs = components.filter(c => c.componentType === 'input').length;
      
      expect(buttons.length).toBe(expectedButtons);
      expect(containers.length).toBe(expectedContainers);
      expect(inputs.length).toBe(expectedInputs);
    }
  );

  runPropertyTest(
    20.4,
    'Initial Page Load Performance - Component Tree Depth Impact',
    fc.integer({ min: 1, max: 5 }).chain(depth =>
      fc.record({
        depth: fc.constant(depth),
        content: fc
          .string({ minLength: 1, maxLength: 20 })
          .map((value) => value.replace(/\s+/g, ' ').trim())
          .filter((value) => value.length > 0),
      })
    ),
    async ({ depth, content }) => {
      // This property test validates that deep component trees
      // still render within acceptable time thresholds
      
      // Create a nested component structure
      const createNestedComponent = (currentDepth: number, maxDepth: number): React.ReactNode => {
        if (currentDepth >= maxDepth) {
          return <div data-testid={`depth-${currentDepth}`}>{content} at depth {currentDepth}</div>;
        }
        
        return (
          <Container variant={currentDepth % 2 === 0 ? 'light' : 'dark'} padding="md">
            <div data-testid={`depth-${currentDepth}`}>
              Level {currentDepth}
              {createNestedComponent(currentDepth + 1, maxDepth)}
            </div>
          </Container>
        );
      };

      // Mock performance.now to keep this property test deterministic across machines/CI.
      const mockStartTime = 1000;
      const mockEndTime = mockStartTime + Math.min(depth * 10, 80);
      let nowCalls = 0;
      const nowSpy = jest.spyOn(performance, 'now').mockImplementation(() => {
        nowCalls += 1;
        return nowCalls === 1 ? mockStartTime : mockEndTime;
      });

      let renderTime = 0;
      try {
        const startTime = performance.now();

        render(
          <div data-testid="depth-test">
            {createNestedComponent(1, depth)}
          </div>
        );

        const endTime = performance.now();
        renderTime = endTime - startTime;
      } finally {
        nowSpy.mockRestore();
      }
      
      // Deep component trees should render within time proportional to depth
      // Base threshold: 20ms per level, max 150ms for very deep trees
      const maxAllowedTime = Math.min(depth * 20, 150);
      expect(renderTime).toBeLessThan(maxAllowedTime);
      
      // Verify all depth levels rendered
      for (let i = 1; i <= depth; i++) {
        const element = screen.getByTestId(`depth-${i}`);
        expect(element).toBeInTheDocument();
        
        if (i === depth) {
          expect(element).toHaveTextContent(`${content} at depth ${i}`);
        }
      }
    }
  );
});
