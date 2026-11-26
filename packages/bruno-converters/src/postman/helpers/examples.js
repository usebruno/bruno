import { normalizeHeaders } from './key-values';

export const toExampleName = (name, index) => {
  const sanitized = String(name ?? '').replace(/\r?\n/g, ' ').trim();
  return sanitized || `Example ${index + 1}`;
};

/**
 * Postman's own response body type reflects the preview language the user picked (often `text`
 * for JSON or XML), so the Content-Type header is the more reliable source.
 */
export const getResponseBodyType = (headers) => {
  const contentTypeHeader = normalizeHeaders(headers)
    .find((header) => header && typeof header.key === 'string' && header.key.toLowerCase() === 'content-type');

  if (!contentTypeHeader || typeof contentTypeHeader.value !== 'string') {
    return 'text';
  }

  const contentType = contentTypeHeader.value.toLowerCase();
  if (contentType.includes('application/json')) return 'json';
  if (contentType.includes('application/xml') || contentType.includes('text/xml')) return 'xml';
  if (contentType.includes('text/html')) return 'html';
  return 'text';
};
