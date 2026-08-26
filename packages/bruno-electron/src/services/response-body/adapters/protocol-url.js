const SCHEME = 'bruno-response';

/**
 * Parse bodyRef from bruno-response://body/<bodyRef> URLs.
 * Pure helper — no Electron imports.
 */
const parseBodyRefFromUrl = (requestUrl) => {
  try {
    const u = new URL(requestUrl);
    if (u.protocol !== `${SCHEME}:`) return null;
    const host = u.hostname; // "body"
    const ref = u.pathname.replace(/^\//, '');
    if (host === 'body' && ref) return ref;
    if (u.host === 'body' || host === 'body') return ref || null;
  } catch (_) {
    /* ignore */
  }
  return null;
};

module.exports = {
  SCHEME,
  parseBodyRefFromUrl
};
