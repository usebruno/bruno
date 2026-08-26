import { useMemo } from 'react';
import { mediaUrlFor } from '../../core/media-url';

/**
 * Protocol URL for PDF/image/audio/video previews.
 */
export const useResponseMediaSrc = (bodyRef, contentType) => {
  return useMemo(() => {
    if (!bodyRef) return null;
    return mediaUrlFor(bodyRef);
  }, [bodyRef, contentType]);
};
