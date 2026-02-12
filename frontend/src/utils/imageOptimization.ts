// imageOptimization.ts - Image optimization utilities

export interface ImageSource {
  src: string;
  width: number;
  height: number;
  format: 'jpg' | 'png' | 'webp' | 'avif';
}

export interface ResponsiveImageConfig {
  src: string;
  alt: string;
  widths: number[];
  aspectRatio: number; // width / height
  formats?: ('webp' | 'avif' | 'jpg' | 'png')[];
  quality?: number;
  loading?: 'lazy' | 'eager';
}

/**
 * Generate responsive image sources for different screen sizes
 */
export function generateResponsiveSources(
  baseSrc: string,
  widths: number[],
  aspectRatio: number,
  formats: string[] = ['webp', 'jpg'],
  quality: number = 80
): ImageSource[] {
  const sources: ImageSource[] = [];

  for (const format of formats) {
    for (const width of widths) {
      const height = Math.round(width / aspectRatio);
      
      // In a real implementation, this would generate URLs for different image sizes
      // For now, we'll return placeholder data
      sources.push({
        src: `${baseSrc}?width=${width}&format=${format}&quality=${quality}`,
        width,
        height,
        format: format as 'jpg' | 'png' | 'webp' | 'avif',
      });
    }
  }

  return sources;
}

/**
 * Generate srcSet string for responsive images
 */
export function generateSrcSet(
  baseSrc: string,
  widths: number[],
  format: string = 'jpg',
  quality: number = 80
): string {
  return widths
    .map(width => `${baseSrc}?width=${width}&format=${format}&quality=${quality} ${width}w`)
    .join(', ');
}

/**
 * Generate picture element sources for multiple formats
 */
export function generatePictureSources(
  baseSrc: string,
  widths: number[],
  formats: string[] = ['webp', 'jpg'],
  quality: number = 80
): Array<{ type: string; srcSet: string }> {
  return formats.map(format => ({
    type: `image/${format}`,
    srcSet: generateSrcSet(baseSrc, widths, format, quality),
  }));
}

/**
 * Calculate optimal image size based on viewport and device pixel ratio
 */
export function calculateOptimalSize(
  containerWidth: number,
  maxWidth: number,
  devicePixelRatio: number = 1
): number {
  const targetWidth = Math.min(containerWidth, maxWidth);
  return Math.round(targetWidth * devicePixelRatio);
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Check if WebP is supported
 */
export async function isWebPSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // Check using canvas method
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  
  return false;
}

/**
 * Check if AVIF is supported
 */
export async function isAVIFSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // Create test image
  const avifData = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = avifData;
  });
}

/**
 * Get optimal image format based on browser support
 */
export async function getOptimalFormat(): Promise<'webp' | 'avif' | 'jpg' | 'png'> {
  if (await isAVIFSupported()) return 'avif';
  if (await isWebPSupported()) return 'webp';
  return 'jpg';
}