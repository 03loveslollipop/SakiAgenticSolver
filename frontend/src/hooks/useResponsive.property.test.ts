// useResponsive.property.test.ts - Property-based tests for useResponsive hook
import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { useResponsive } from './useResponsive';
import { runPropertyTest } from '../test-utils/test-config';

describe('useResponsive Hook Properties', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  runPropertyTest(
    1,
    'Responsive Breakpoint Detection',
    fc.integer({ min: 320, max: 2560 }),
    (width) => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      
      const { result } = renderHook(() => useResponsive());
      
      // Verify correct breakpoint detection
      if (width < 768) {
        expect(result.current.isMobile).toBe(true);
        expect(result.current.isDesktop).toBe(false);
        expect(result.current.breakpoint).toBe('mobile');
      } else if (width < 1024) {
        expect(result.current.isMobile).toBe(false);
        expect(result.current.isTablet).toBe(true);
        expect(result.current.isDesktop).toBe(false);
        expect(result.current.breakpoint).toBe('tablet');
      } else if (width < 1440) {
        expect(result.current.isMobile).toBe(false);
        expect(result.current.isTablet).toBe(false);
        expect(result.current.isDesktop).toBe(true);
        expect(result.current.breakpoint).toBe('desktop');
      } else {
        expect(result.current.isMobile).toBe(false);
        expect(result.current.isTablet).toBe(false);
        expect(result.current.isDesktop).toBe(true);
        expect(result.current.breakpoint).toBe('wide');
      }
    }
  );

  it('Feature: frontend-ui-8bit-redesign, Property 1: Responsive Breakpoint Detection - Consistency across resize events', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 320, max: 2560 }), { minLength: 2, maxLength: 5 }),
        (widths) => {
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: widths[0],
          });

          const { result } = renderHook(() => useResponsive());
          
          // Test each width in sequence
          widths.forEach((width) => {
            act(() => {
              Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: width,
              });
              window.dispatchEvent(new Event('resize'));
            });

            // Verify categorization remains consistent
            if (width < 768) {
              expect(result.current.isMobile).toBe(true);
              expect(result.current.isDesktop).toBe(false);
            } else {
              expect(result.current.isMobile).toBe(false);
              expect(result.current.isDesktop).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
