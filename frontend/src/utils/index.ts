// index.ts - Utils module exports
export { handleNetworkError } from './errorHandler';
export type { NetworkError } from './errorHandler';

export { validateForm, validationRules } from './validation';
export type { ValidationError, ValidationResult } from './validation';

export {
  generateResponsiveSources,
  generateSrcSet,
  generatePictureSources,
  calculateOptimalSize,
  preloadImage,
  isWebPSupported,
  isAVIFSupported,
  getOptimalFormat,
} from './imageOptimization';
export type { ImageSource, ResponsiveImageConfig } from './imageOptimization';
