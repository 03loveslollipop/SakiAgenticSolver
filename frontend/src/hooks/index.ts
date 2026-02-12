// index.ts - Hooks module exports
export { useResponsive } from './useResponsive';
export type { Breakpoint } from './useResponsive';

// Performance monitoring hooks
export { 
  usePerformanceMonitoring, 
  usePerformanceMetric, 
  useFrameRateMonitoring, 
  usePageLoadPerformance 
} from './usePerformanceMonitoring';
export type { UsePerformanceMonitoringResult } from './usePerformanceMonitoring';
