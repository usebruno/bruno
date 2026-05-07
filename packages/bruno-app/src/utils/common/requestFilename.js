import path from './path';
import { sanitizeName } from './regex';

export const getHttpRequestFilenameBase = (requestName, method = 'GET') => {
  const sanitizedRequestName = sanitizeName(requestName || '') || 'request';
  const normalizedMethod = String(method || 'GET').trim().toUpperCase() || 'GET';
  return sanitizeName(`${normalizedMethod} ${sanitizedRequestName}`);
};

export const getRequestFilenameBase = ({ requestName, requestMethod, requestType }) => {
  if (requestType === 'http-request') {
    return getHttpRequestFilenameBase(requestName, requestMethod);
  }

  return sanitizeName(requestName || '');
};

export const normalizeRequestFilename = (filename, format = 'bru') => {
  const targetExtension = format === 'yml' ? 'yml' : 'bru';
  const extension = path.extname(filename || '').toLowerCase();
  const baseName = ['.bru', '.yml', '.yaml'].includes(extension)
    ? path.basename(filename, extension)
    : filename;

  return `${sanitizeName(baseName || 'request')}.${targetExtension}`;
};
