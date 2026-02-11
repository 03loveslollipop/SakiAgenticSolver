// useResponsive.test.ts - Unit tests for useResponsive hook
import { renderHook, act } from '@testing-library/react';
import { useResponsive } from './useResponsive';

describe('useResponsive Hook', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  describe('Breakpoint Detection', () => {
    it('detects mobile breakpoint for width < 768px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('mobile');
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it('detects tablet breakpoint for width >= 768px and < 1024px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('tablet');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('detects desktop breakpoint for width >= 1024px and < 1440px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('desktop');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });

    it('detects wide breakpoint for width >= 1440px', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('wide');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });
  });

  describe('Resize Events', () => {
    it('updates breakpoint on window resize', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      const { result } = renderHook(() => useResponsive());
      expect(result.current.isMobile).toBe(true);

      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1200,
        });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
    });

    it('handles multiple resize events', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      const { result } = renderHook(() => useResponsive());
      expect(result.current.breakpoint).toBe('mobile');

      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 800,
        });
        window.dispatchEvent(new Event('resize'));
      });
      expect(result.current.breakpoint).toBe('tablet');

      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1200,
        });
        window.dispatchEvent(new Event('resize'));
      });
      expect(result.current.breakpoint).toBe('desktop');
    });
  });

  describe('Cleanup', () => {
    it('removes resize event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useResponsive());
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Boundary Values', () => {
    it('correctly handles exact breakpoint boundaries', () => {
      // Test 768px boundary (mobile/tablet)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      });
      const { result: result1 } = renderHook(() => useResponsive());
      expect(result1.current.isMobile).toBe(true);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      const { result: result2 } = renderHook(() => useResponsive());
      expect(result2.current.isTablet).toBe(true);

      // Test 1024px boundary (tablet/desktop)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1023,
      });
      const { result: result3 } = renderHook(() => useResponsive());
      expect(result3.current.isTablet).toBe(true);

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      const { result: result4 } = renderHook(() => useResponsive());
      expect(result4.current.isDesktop).toBe(true);
    });
  });
});
