import React, { useState, useCallback } from 'react';
import { optimizeCloudinaryUrl } from '../lib/optimizeUrl';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Cloudinary width hint for URL transforms (optional) */
  cloudinaryWidth?: number;
}

/**
 * Drop-in replacement for <img> that:
 * 1. Auto-optimizes Cloudinary URLs (q_auto, f_auto, optional width)
 * 2. Adds loading="lazy" and decoding="async" by default
 * 3. Shows a subtle skeleton placeholder while loading
 * 4. Handles error gracefully with a transparent fallback
 *
 * All existing className, style, onClick, etc. are forwarded unchanged.
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  cloudinaryWidth,
  className = '',
  style,
  onLoad,
  onError,
  ...rest
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const optimizedSrc = src ? optimizeCloudinaryUrl(src, cloudinaryWidth) : src;

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setLoaded(true);
      onLoad?.(e);
    },
    [onLoad]
  );

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setError(true);
      setLoaded(true); // Stop showing skeleton
      onError?.(e);
    },
    [onError]
  );

  if (error) {
    // Return an empty div with same className to maintain layout
    return <div className={className} style={style} />;
  }

  return (
    <>
      {/* Skeleton placeholder — shown until image loads */}
      {!loaded && (
        <div
          className={className}
          style={{
            ...style,
            background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            position: 'absolute',
            inset: 0,
          }}
        />
      )}
      <img
        src={optimizedSrc}
        className={className}
        style={{
          ...style,
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s ease-in',
        }}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        {...rest}
      />
    </>
  );
};

export default React.memo(OptimizedImage);
