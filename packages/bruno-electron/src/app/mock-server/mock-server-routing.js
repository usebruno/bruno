const DEFAULT_GATEWAY_PORT = 4000;

const normalizeUrlPath = (urlStr) => {
  if (!urlStr) return '';
  return urlStr
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/\?.*$/, '')
    .replace(/{([^}]+)}/g, ':$1')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
};

module.exports = {
  DEFAULT_GATEWAY_PORT,
  normalizeUrlPath
};
