/**
 * Optimizes a Cloudinary image URL by injecting auto-quality and auto-format transforms.
 * - Only modifies Cloudinary image URLs (contains 'cloudinary' and '/upload/')
 * - Does NOT modify PDFs, blob URLs, data URLs, or non-Cloudinary URLs
 * - Optionally accepts a width parameter for responsive sizing
 */
export function optimizeCloudinaryUrl(url: string, width?: number): string {
  if (!url) return url;

  // Skip non-Cloudinary URLs, blob URLs, data URLs
  if (!url.includes('cloudinary') || !url.includes('/upload/')) return url;

  // Skip PDFs
  if (url.toLowerCase().includes('.pdf')) return url;

  // Don't double-apply transforms
  if (url.includes('q_auto') || url.includes('f_auto')) return url;

  // Build transform string
  let transforms = 'q_auto,f_auto';
  if (width) {
    transforms += `,w_${width}`;
  }

  return url.replace('/upload/', `/upload/${transforms}/`);
}
