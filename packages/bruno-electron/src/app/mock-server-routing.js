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

const sanitizeCollectionNameForSlug = (collectionName) => {
  const slug = (collectionName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);

  return slug || 'collection';
};

const allocateCollectionSlug = (collectionName, collectionUid, slugToCollectionUid) => {
  const baseSlug = sanitizeCollectionNameForSlug(collectionName);
  const existingUid = slugToCollectionUid.get(baseSlug);

  if (!existingUid || existingUid === collectionUid) {
    return baseSlug;
  }

  const uidSuffix = (collectionUid || '').slice(0, 4).toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${baseSlug}-${uidSuffix || 'mock'}`;
};

const stripCollectionPrefix = (reqPath, slug) => {
  if (!slug) return reqPath;

  const prefix = `/${slug}`;
  if (reqPath === prefix) return '/';
  if (reqPath.startsWith(`${prefix}/`)) {
    return reqPath.slice(prefix.length) || '/';
  }

  return reqPath;
};

const buildBaseUrl = ({ mode, port, slug }) => {
  if (mode === 'shared') {
    return `http://127.0.0.1:${port}/${slug}`;
  }

  return `http://127.0.0.1:${port}`;
};

module.exports = {
  DEFAULT_GATEWAY_PORT,
  normalizeUrlPath,
  sanitizeCollectionNameForSlug,
  allocateCollectionSlug,
  stripCollectionPrefix,
  buildBaseUrl
};
