// performanceMonitoring.ts - Performance monitoring utilities

export interface PerformanceMetrics {
  // Navigation Timing API metrics
  navigationStart: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  loadEventStart: number;
  loadEventEnd: number;
  
  // Custom metrics
  timeToFirstByte?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  
  // Resource timing
  resourceLoadTimes: Record<string, number>;
  
  // Animation performance
  animationFrameRates: number[];
  droppedFrames: number;
}

export interface PerformanceReport {
  timestamp: number;
  url: string;
  metrics: PerformanceMetrics;
  userAgent: string;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private animationFrameRates: number[] = [];
  private droppedFrames = 0;
  private lastFrameTime = 0;
  private frameCount = 0;
  private animationFrameId?: number;
  private resourceObservers: PerformanceObserver[] = [];

  constructor() {
    this.setupNavigationTiming();
    this.setupResourceTiming();
    this.setupPaintTiming();
    this.setupLayoutShiftTracking();
    this.setupAnimationMonitoring();
  }

  /**
   * Setup navigation timing metrics
   */
  private setupNavigationTiming() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const perf = window.performance;
      const navigation = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        this.metrics.navigationStart = navigation.startTime;
        this.metrics.domContentLoadedEventStart = navigation.domContentLoadedEventStart;
        this.metrics.domContentLoadedEventEnd = navigation.domContentLoadedEventEnd;
        this.metrics.loadEventStart = navigation.loadEventStart;
        this.metrics.loadEventEnd = navigation.loadEventEnd;
        this.metrics.timeToFirstByte = navigation.responseStart - navigation.requestStart;
      }
    }
  }

  /**
   * Setup resource timing metrics
   */
  private setupResourceTiming() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const resourceEntry = entry as PerformanceResourceTiming;
            const resourceName = resourceEntry.name.split('/').pop() || 'unknown';
            this.metrics.resourceLoadTimes = this.metrics.resourceLoadTimes || {};
            this.metrics.resourceLoadTimes[resourceName] = resourceEntry.duration;
          });
        });
        
        observer.observe({ entryTypes: ['resource'] });
        this.resourceObservers.push(observer);
      } catch (e) {
        console.warn('Resource timing not supported:', e);
      }
    }
  }

  /**
   * Setup paint timing metrics (FCP, LCP)
   */
  private setupPaintTiming() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.firstContentfulPaint = entry.startTime;
            }
          });
        });
        
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.resourceObservers.push(fcpObserver);

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = lastEntry.startTime;
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.resourceObservers.push(lcpObserver);
      } catch (e) {
        console.warn('Paint timing not supported:', e);
      }
    }
  }

  /**
   * Setup Layout Shift tracking
   */
  private setupLayoutShiftTracking() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          this.metrics.cumulativeLayoutShift = clsValue;
        });
        
        observer.observe({ entryTypes: ['layout-shift'] });
        this.resourceObservers.push(observer);
      } catch (e) {
        console.warn('Layout Shift tracking not supported:', e);
      }
    }
  }

  /**
   * Setup animation frame rate monitoring
   */
  private setupAnimationMonitoring() {
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      const measureFrameRate = (timestamp: number) => {
        if (this.lastFrameTime) {
          const delta = timestamp - this.lastFrameTime;
          const fps = 1000 / delta;
          
          this.animationFrameRates.push(fps);
          
          // Track dropped frames (fps < 30)
          if (fps < 30) {
            this.droppedFrames++;
          }
          
          // Keep only last 100 measurements
          if (this.animationFrameRates.length > 100) {
            this.animationFrameRates.shift();
          }
        }
        
        this.lastFrameTime = timestamp;
        this.frameCount++;
        this.animationFrameId = requestAnimationFrame(measureFrameRate);
      };
      
      this.animationFrameId = requestAnimationFrame(measureFrameRate);
    }
  }

  /**
   * Get First Input Delay
   */
  public measureFirstInputDelay(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const fidEntry = entry as PerformanceEventTiming;
            this.metrics.firstInputDelay = fidEntry.processingStart - fidEntry.startTime;
          });
        });
        
        observer.observe({ entryTypes: ['first-input'] });
        this.resourceObservers.push(observer);
      } catch (e) {
        console.warn('First Input Delay tracking not supported:', e);
      }
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): Partial<PerformanceMetrics> {
    return {
      ...this.metrics,
      animationFrameRates: [...this.animationFrameRates],
      droppedFrames: this.droppedFrames,
    };
  }

  /**
   * Generate performance report
   */
  public generateReport(): PerformanceReport {
    const metrics = this.getMetrics();
    
    return {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      metrics: metrics as PerformanceMetrics,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      connection: this.getConnectionInfo(),
    };
  }

  /**
   * Get network connection information
   */
  private getConnectionInfo() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
      };
    }
    return undefined;
  }

  /**
   * Send performance report to analytics endpoint
   */
  public async sendReport(endpoint: string = '/api/performance-metrics'): Promise<boolean> {
    try {
      const report = this.generateReport();
      
      // In a real implementation, you would send this to your analytics endpoint
      console.log('Performance Report:', report);
      
      // Example fetch call (commented out for now)
      // await fetch(endpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report),
      // });
      
      return true;
    } catch (error) {
      console.error('Failed to send performance report:', error);
      return false;
    }
  }

  /**
   * Clean up observers and timers
   */
  public cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.resourceObservers.forEach(observer => observer.disconnect());
    this.resourceObservers = [];
  }

  /**
   * Measure time to interactive (custom implementation)
   */
  public measureTimeToInteractive(): number | undefined {
    if (this.metrics.domContentLoadedEventEnd && this.metrics.firstInputDelay) {
      return this.metrics.domContentLoadedEventEnd + this.metrics.firstInputDelay;
    }
    return undefined;
  }

  /**
   * Get average frame rate
   */
  public getAverageFrameRate(): number {
    if (this.animationFrameRates.length === 0) return 0;
    
    const sum = this.animationFrameRates.reduce((a, b) => a + b, 0);
    return sum / this.animationFrameRates.length;
  }

  /**
   * Get frame rate stability (standard deviation)
   */
  public getFrameRateStability(): number {
    if (this.animationFrameRates.length < 2) return 0;
    
    const avg = this.getAverageFrameRate();
    const squareDiffs = this.animationFrameRates.map(fps => Math.pow(fps - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

export function cleanupPerformanceMonitor() {
  if (performanceMonitor) {
    performanceMonitor.cleanup();
    performanceMonitor = null;
  }
}

// Note: React hook implementation would require React import
// For now, we'll export the hook structure but it needs to be implemented
// in a separate file with React dependencies

export interface UsePerformanceMonitoringResult {
  metrics: Partial<PerformanceMetrics>;
  averageFrameRate: number;
  frameRateStability: number;
  timeToInteractive?: number;
}