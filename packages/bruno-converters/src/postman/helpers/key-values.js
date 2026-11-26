import { uuid } from '../../common';
import { ensureString, transformDescription } from './values';

const isEntry = (entry) => entry != null && typeof entry === 'object';
const hasKeyOrValue = (entry) => !(entry.key == null && entry.value == null);

const parseStringHeader = (header) => {
  const colonIndex = header.indexOf(':');
  if (colonIndex === -1) return { key: header.trim(), value: '' };
  return {
    key: header.substring(0, colonIndex).trim(),
    value: header.substring(colonIndex + 1).trim()
  };
};

// Postman's v2.1 schema allows headers as objects, "Key: Value" strings, a mix, or one newline-separated string.
export const normalizeHeaders = (headers) => {
  if (!headers) return [];

  if (typeof headers === 'string') {
    return headers.split(/\r?\n/).filter(Boolean).map(parseStringHeader);
  }

  if (!Array.isArray(headers)) return [];

  return headers.map((header) => (typeof header === 'string' ? parseStringHeader(header) : header));
};

export const toBrunoHeaders = (headers) => normalizeHeaders(headers)
  .filter(isEntry)
  .filter(hasKeyOrValue)
  .map((header) => ({
    uid: uuid(),
    name: ensureString(header.key),
    value: ensureString(header.value),
    description: transformDescription(header.description),
    enabled: !header.disabled
  }));

export const toBrunoQueryParams = (params) => (Array.isArray(params) ? params : [])
  .filter(isEntry)
  .filter(hasKeyOrValue)
  .map((param) => ({
    uid: uuid(),
    name: ensureString(param.key),
    value: ensureString(param.value),
    description: transformDescription(param.description),
    type: 'query',
    enabled: !param.disabled
  }));

export const toBrunoPathParams = (params) => (Array.isArray(params) ? params : [])
  .filter(isEntry)
  .filter((param) => param.key)
  .map((param) => ({
    uid: uuid(),
    name: ensureString(param.key),
    value: ensureString(param.value),
    description: transformDescription(param.description),
    type: 'path',
    enabled: true
  }));

export const toBrunoFormUrlEncoded = (fields) => (Array.isArray(fields) ? fields : [])
  .filter(isEntry)
  .filter(hasKeyOrValue)
  .map((field) => ({
    uid: uuid(),
    name: ensureString(field.key),
    value: ensureString(field.value),
    description: transformDescription(field.description),
    enabled: !field.disabled
  }));

const toFileSources = (src) => {
  if (Array.isArray(src)) return src;
  return src ? [src] : [];
};

export const toBrunoMultipartForm = (fields) => (Array.isArray(fields) ? fields : [])
  .filter(isEntry)
  .filter(hasKeyOrValue)
  .map((field) => {
    // Postman's "Auto" field type exports as `type: 'default'`; a `src` makes it a file.
    const isFile = field.type === 'file' || (field.type === 'default' && field.src);
    const textValue = Array.isArray(field.value) ? field.value.join('') : ensureString(field.value);

    return {
      uid: uuid(),
      type: isFile ? 'file' : 'text',
      name: ensureString(field.key),
      value: isFile ? toFileSources(field.src) : textValue,
      description: transformDescription(field.description),
      enabled: !field.disabled,
      ...(field.contentType && { contentType: field.contentType })
    };
  });
