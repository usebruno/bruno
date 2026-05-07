const invalidCharacters = /[<>:"/\\|?*\x00-\x1F]/g;

export const sanitizeRequestFilename = (name = '') => {
  return String(name)
    .replace(invalidCharacters, '-')
    .replace(/^[\s\-]+/, '')
    .replace(/[.\s]+$/, '');
};

export const getHttpRequestFilenameBase = (requestName, method = 'GET') => {
  const sanitizedRequestName = sanitizeRequestFilename(requestName) || 'request';
  const normalizedMethod = String(method || 'GET').trim().toUpperCase() || 'GET';
  return sanitizeRequestFilename(`${normalizedMethod} ${sanitizedRequestName}`);
};

export const getUniqueHttpRequestFilename = (requestName, method, usedFilenames = new Set()) => {
  const baseName = getHttpRequestFilenameBase(requestName, method);
  let filename = baseName;
  let counter = 1;

  while (usedFilenames.has(filename)) {
    filename = `${baseName} ${counter}`;
    counter++;
  }

  usedFilenames.add(filename);
  return filename;
};
