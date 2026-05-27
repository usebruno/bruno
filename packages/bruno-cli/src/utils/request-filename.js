const path = require('path');

const REQUEST_EXTENSIONS = ['.bru', '.yml', '.yaml'];
const invalidCharacters = /[<>:"/\\|?*\x00-\x1F]/g;

const sanitizeName = (name = '') => {
  return String(name)
    .replace(invalidCharacters, '-')
    .replace(/^[\s\-]+/, '')
    .replace(/[.\s]+$/, '');
};

const getRequestExtension = (format = 'bru') => (format === 'yml' ? 'yml' : 'bru');

const getHttpRequestFilenameBase = (requestName, method = 'GET') => {
  const sanitizedRequestName = sanitizeName(requestName || '') || 'request';
  const normalizedMethod = String(method || 'GET').trim().toUpperCase() || 'GET';
  return sanitizeName(`${normalizedMethod} ${sanitizedRequestName}`);
};

const normalizeRequestFilename = (filename, format = 'bru') => {
  const targetExtension = getRequestExtension(format);
  const extension = path.extname(filename || '').toLowerCase();
  const baseName = REQUEST_EXTENSIONS.includes(extension)
    ? path.basename(filename, extension)
    : filename;

  return `${sanitizeName(baseName || 'request')}.${targetExtension}`;
};

const getRequestFilename = (item, format = 'bru') => {
  if (item?.filename) {
    return normalizeRequestFilename(item.filename, format);
  }

  if (item?.type === 'http-request') {
    return normalizeRequestFilename(getHttpRequestFilenameBase(item.name, item.request?.method), format);
  }

  return normalizeRequestFilename(item?.name || 'request', format);
};

const getUniqueRequestFilename = (item, format, checkExists) => {
  const extension = getRequestExtension(format);
  const filename = getRequestFilename(item, format);
  const baseName = path.basename(filename, `.${extension}`);

  if (!checkExists(filename)) {
    return filename;
  }

  let counter = 1;
  let uniqueFilename = `${baseName} ${counter}.${extension}`;

  while (checkExists(uniqueFilename)) {
    counter++;
    uniqueFilename = `${baseName} ${counter}.${extension}`;
  }

  return uniqueFilename;
};

module.exports = {
  getHttpRequestFilenameBase,
  getRequestFilename,
  getUniqueRequestFilename,
  normalizeRequestFilename
};
