// LazyImage.tsx - Lazy-loaded image component with WebP support
import React, { useState, useEffect, useRef } from 'react';

export interface LazyImageProps {
  src: string;
  srcSet?: string;
  webpSrc?: string;
  webpSrcSet?: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  loading?: 'lazy' | 'eager';
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  srcSet,
  webpSrc,
  webpSrcSet,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  placeholder,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || loading === 'eager') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before element enters viewport
        threshold: 0.1,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loading]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    onError?.();
  };

  const shouldShowPlaceholder = !isLoaded && placeholder;
  const shouldLoadImage = isInView || loading === 'eager';

  return (
    <div ref={containerRef} className={`lazy-image-container ${className}`}>
      {/* WebP source for browsers that support it */}
      {shouldLoadImage && webpSrc && (
        <picture>
          {webpSrcSet && (
            <source
              type="image/webp"
              srcSet={webpSrcSet}
              sizes={width ? `${width}px` : undefined}
            />
          )}
          {webpSrc && (
            <source
              type="image/webp"
              srcSet={webpSrc}
            />
          )}
          
          {/* Fallback image */}
          <img
            ref={imgRef}
            src={shouldLoadImage ? src : undefined}
            srcSet={shouldLoadImage ? srcSet : undefined}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            onLoad={handleLoad}
            onError={handleError}
            className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
            style={{
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
            }}
          />
        </picture>
      )}

      {/* Regular image without WebP */}
      {shouldLoadImage && !webpSrc && (
        <img
          ref={imgRef}
          src={src}
          srcSet={srcSet}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        />
      )}

      {/* Placeholder */}
      {shouldShowPlaceholder && (
        <div className="lazy-image-placeholder">
          {placeholder}
        </div>
      )}

      {/* Loading indicator */}
      {!isLoaded && !placeholder && (
        <div className="lazy-image-loading">
          <div className="lazy-image-loading-spinner" />
        </div>
      )}
    </div>
  );
};

export default LazyImage;