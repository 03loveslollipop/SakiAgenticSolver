// PixelArt.tsx - Lazy-loaded pixel art component
import React from 'react';

export interface PixelArtProps {
  width?: number;
  height?: number;
  variant?: 'hero' | 'feature' | 'decoration';
  className?: string;
}

export const PixelArt: React.FC<PixelArtProps> = ({
  width = 200,
  height = 200,
  variant = 'hero',
  className = '',
}) => {
  const renderHeroArt = () => (
    <svg width={width} height={height} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#1ABBDB"/>
      <rect x="40" y="40" width="120" height="120" fill="#DBC70F"/>
      <rect x="60" y="60" width="80" height="80" fill="#DB6495"/>
      <rect x="80" y="80" width="40" height="40" fill="#5C3947"/>
      <rect x="90" y="90" width="20" height="20" fill="#3D7A86"/>
    </svg>
  );

  const renderFeatureArt = () => (
    <svg width={width} height={height} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#5C3947"/>
      <rect x="20" y="20" width="60" height="60" fill="#DBC70F"/>
      <rect x="30" y="30" width="40" height="40" fill="#1ABBDB"/>
      <rect x="40" y="40" width="20" height="20" fill="#DB6495"/>
    </svg>
  );

  const renderDecorationArt = () => (
    <svg width={width} height={height} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="50" fill="#DB6495"/>
      <rect x="10" y="10" width="30" height="30" fill="#DBC70F"/>
      <rect x="15" y="15" width="20" height="20" fill="#1ABBDB"/>
    </svg>
  );

  const renderArt = () => {
    switch (variant) {
      case 'hero':
        return renderHeroArt();
      case 'feature':
        return renderFeatureArt();
      case 'decoration':
        return renderDecorationArt();
      default:
        return renderHeroArt();
    }
  };

  return (
    <div className={`inline-block ${className}`} style={{ imageRendering: 'pixelated' }}>
      {renderArt()}
    </div>
  );
};
