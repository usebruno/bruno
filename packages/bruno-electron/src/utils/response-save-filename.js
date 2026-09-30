const path = require('node:path');
const contentDispositionParser = require('content-disposition');
const mime = require('mime-types');

const getHeaderValue = (headers, headerName) => {
  const headersObj = headers && typeof headers === 'object' ? headers : {};
  const entry = Object.entries(headersObj).find(([name]) => name === headerName);
  return entry ? entry[1] : undefined;
};

/**
 * Resolve a default download filename from response headers / request URL.
 */
const resolveResponseSaveFilename = ({ headers, url } = {}) => {
  try {
    const disposition = contentDispositionParser.parse(getHeaderValue(headers, 'content-disposition'));
    if (disposition?.parameters?.filename) {
      return disposition.parameters.filename;
    }
  } catch (_) {
    /* ignore */
  }

  try {
    const lastPathLevel = new URL(url).pathname.split('/').pop();
    if (lastPathLevel && /\..+/.exec(lastPathLevel)) {
      return lastPathLevel;
    }
  } catch (_) {
    /* ignore */
  }

  const contentType = getHeaderValue(headers, 'content-type');
  const extension = (contentType && mime.extension(contentType)) || 'txt';
  return `response.${extension}`;
};

const resolveResponseSaveDefaultPath = ({ headers, url, pathname } = {}) => {
  const fileName = resolveResponseSaveFilename({ headers, url });
  if (!pathname) return fileName;
  return path.join(path.dirname(pathname), fileName);
};

module.exports = {
  getHeaderValue,
  resolveResponseSaveFilename,
  resolveResponseSaveDefaultPath
};
