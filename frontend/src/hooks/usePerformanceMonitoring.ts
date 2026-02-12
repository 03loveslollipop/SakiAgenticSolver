// usePerformanceMonitoring.ts - React hook for performance monitoring
import { useState, useEffect } from 'react';
import { 
  getPerformanceMonitor, 
  type PerformanceMetrics 
} from '../utils/performanceMonitoring';

export interface UsePerformanceMonitoringResult {
  metrics: Partial<PerformanceMetrics>;
  averageFrameRate: number;
  frameRateStability: number;
  timeToInteractive?: number;
  isMonitoring: boolean;
}

export function usePerformanceMonitoring(enabled: boolean = true): UsePerformanceMonitoringResult {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setIsMonitoring(false);
      return;
    }

    setIsMonitoring(true);
    const monitor = getPerformanceMonitor();

    // Measure First Input Delay
    monitor.measureFirstInputDelay();

    // Update metrics every 5 seconds
    const intervalId = setInterval(() => {
      const currentMetrics = monitor.getMetrics();
      setMetrics(currentMetrics);
    }, 5000);

    // Send report on page unload
    const handleBeforeUnload = () => {
      monitor.sendReport();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initial metrics update
    setMetrics(monitor.getMetrics());

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Only cleanup if this is the last hook using it
      // In a real app, you might want to keep it running
      // cleanupPerformanceMonitor();
    };
  }, [enabled]);

  const averageFrameRate = metrics.animationFrameRates?.length 
    ? metrics.animationFrameRates.reduce((a, b) => a + b, 0) / metrics.animationFrameRates.length
    : 0;

  const frameRateStability = (() => {
    if (!metrics.animationFrameRates || metrics.animationFrameRates.length < 2) return 0;
    
    const avg = averageFrameRate;
    const squareDiffs = metrics.animationFrameRates.map(fps => Math.pow(fps - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  })();

  const timeToInteractive = metrics.domContentLoadedEventEnd && metrics.firstInputDelay
    ? metrics.domContentLoadedEventEnd + metrics.firstInputDelay
    : undefined;

  return {
    metrics,
    averageFrameRate,
    frameRateStability,
    timeToInteractive,
    isMonitoring,
  };
}

/**
 * Hook to monitor specific performance metrics
 */
export function usePerformanceMetric<T extends keyof PerformanceMetrics>(
  metricName: T,
  enabled: boolean = true
): PerformanceMetrics[T] | undefined {
  const { metrics } = usePerformanceMonitoring(enabled);
  return metrics[metricName];
}

/**
 * Hook to monitor frame rate
 */
export function useFrameRateMonitoring(enabled: boolean = true) {
  const { averageFrameRate, frameRateStability, metrics } = usePerformanceMonitoring(enabled);
  
  return {
    averageFrameRate,
    frameRateStability,
    droppedFrames: metrics.droppedFrames || 0,
    frameRates: metrics.animationFrameRates || [],
    isStable: frameRateStability < 5, // Less than 5 FPS standard deviation
  };
}

/**
 * Hook to monitor page load performance
 */
export function usePageLoadPerformance(enabled: boolean = true) {
  const { metrics, timeToInteractive } = usePerformanceMonitoring(enabled);
  
  return {
    navigationStart: metrics.navigationStart,
    domContentLoaded: metrics.domContentLoadedEventEnd,
    loadEventEnd: metrics.loadEventEnd,
    firstContentfulPaint: metrics.firstContentfulPaint,
    largestContentfulPaint: metrics.largestContentfulPaint,
    timeToInteractive,
    timeToFirstByte: metrics.timeToFirstByte,
    cumulativeLayoutShift: metrics.cumulativeLayoutShift,
  };
}
