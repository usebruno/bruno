/**
 * Utility functions for processing response body content and determining body type
 */

import { extractMimeType } from './response';

/**
 * Determines whether a content-type denotes binary media that should be
 * persisted as base64 rather than decoded to text.
 * SVG (`image/svg+xml`) is XML text and is deliberately excluded.
 * @param {string} contentType - The content-type header value
 * @returns {boolean}
 */
export const isBinaryContentType = (contentType = '') => {
  const mime = extractMimeType(contentType);

  if (mime.endsWith('+xml')) {
    return false;
  }

  return (
    mime.startsWith('image/')
    || mime.startsWith('audio/')
    || mime.startsWith('video/')
    || mime === 'application/pdf'
    || mime === 'application/octet-stream'
  );
};

/**
 * Determines the body type based on content-type header
 * @param {string} contentType - The content-type header value
 * @param {Buffer} dataBuffer - Optional binary data buffer
 * @returns {string} - The body type (json, xml, html, text, binary)
 */
export const getBodyType = (contentType = '') => {
  const normalizedContentType = contentType.toLowerCase();

  if (normalizedContentType.includes('application/json')) {
    return 'json';
  } else if (normalizedContentType.includes('text/xml') || normalizedContentType.includes('application/xml')) {
    return 'xml';
  } else if (normalizedContentType.includes('text/html')) {
    return 'html';
  } else if (isBinaryContentType(normalizedContentType)) {
    return 'binary';
  }

  return 'text';
};

/**
 * Resolves the body type to persist for a response example. The sniffed mime
 * (from the response's magic bytes) wins only when it identifies binary media,
 * so a mislabeled image is stored as binary; otherwise the content-type header
 * decides, so a JSON body sniffed as generic text still lands as json.
 * @param {string} contentType - The content-type header value
 * @param {string|null} sniffedMime - Mime type detected from the response bytes
 * @returns {string} - The body type (json, xml, html, text, binary)
 */
export const getExampleBodyType = (contentType = '', sniffedMime = null) => {
  if (sniffedMime && isBinaryContentType(sniffedMime)) {
    return 'binary';
  }
  return getBodyType(contentType);
};
