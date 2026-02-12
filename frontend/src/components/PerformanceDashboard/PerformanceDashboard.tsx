// PerformanceDashboard.tsx - Component to display performance metrics
import React from 'react';
import { usePerformanceMonitoring, useFrameRateMonitoring, usePageLoadPerformance } from '../../hooks';

interface PerformanceDashboardProps {
  showDetails?: boolean;
  className?: string;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const { metrics, averageFrameRate, frameRateStability, timeToInteractive, isMonitoring } = usePerformanceMonitoring();
  const { averageFrameRate: frameRate, droppedFrames, isStable } = useFrameRateMonitoring();
  const { 
    firstContentfulPaint, 
    largestContentfulPaint, 
    timeToInteractive: tti, 
    cumulativeLayoutShift 
  } = usePageLoadPerformance();

  if (!isMonitoring) {
    return (
      <div className={`performance-dashboard ${className}`}>
        <div className="performance-status">
          <span className="status-indicator status-offline"></span>
          <span className="status-text">Performance monitoring disabled</span>
        </div>
      </div>
    );
  }

  const formatTime = (ms?: number): string => {
    if (!ms) return 'N/A';
    return `${ms.toFixed(0)}ms`;
  };

  const formatFPS = (fps: number): string => {
    return `${fps.toFixed(1)} FPS`;
  };

  const getPerformanceScore = (): string => {
    if (!firstContentfulPaint) return 'N/A';
    
    if (firstContentfulPaint < 1000) return 'Excellent';
    if (firstContentfulPaint < 2000) return 'Good';
    if (firstContentfulPaint < 3000) return 'Fair';
    return 'Poor';
  };

  return (
    <div className={`performance-dashboard ${className}`}>
      <div className="performance-header">
        <span className="status-indicator status-online"></span>
        <h3 className="dashboard-title">Performance Dashboard</h3>
      </div>
      
      <div className="performance-metrics">
        <div className="metric-row">
          <span className="metric-label">FPS:</span>
          <span className={`metric-value ${isStable ? 'metric-good' : 'metric-warning'}`}>
            {formatFPS(averageFrameRate)}
          </span>
        </div>
        
        <div className="metric-row">
          <span className="metric-label">Dropped Frames:</span>
          <span className={`metric-value ${droppedFrames === 0 ? 'metric-good' : 'metric-warning'}`}>
            {droppedFrames}
          </span>
        </div>
        
        <div className="metric-row">
          <span className="metric-label">FCP:</span>
          <span className="metric-value">{formatTime(firstContentfulPaint)}</span>
        </div>
        
        <div className="metric-row">
          <span className="metric-label">LCP:</span>
          <span className="metric-value">{formatTime(largestContentfulPaint)}</span>
        </div>
        
        <div className="metric-row">
          <span className="metric-label">TTI:</span>
          <span className="metric-value">{formatTime(tti)}</span>
        </div>
        
        <div className="metric-row">
          <span className="metric-label">CLS:</span>
          <span className={`metric-value ${(cumulativeLayoutShift || 0) < 0.1 ? 'metric-good' : 'metric-warning'}`}>
            {(cumulativeLayoutShift || 0).toFixed(3)}
          </span>
        </div>
        
        <div className="metric-row">
          <span className="metric-label">Score:</span>
          <span className="metric-value metric-score">{getPerformanceScore()}</span>
        </div>
      </div>
      
      {showDetails && (
        <div className="performance-details">
          <h4>Detailed Metrics</h4>
          <pre className="metrics-json">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;