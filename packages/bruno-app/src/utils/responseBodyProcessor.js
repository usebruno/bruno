/**
 * Utility functions for processing response body content and determining body type
 */

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
  }

  return 'text';
};
