'use strict';

const crypto = require('crypto');
const path = require('path');

const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|svg|webp|avif|ico)(?:\?[^#]*)?(?:#.*)?$/i;

/**
 * @param {string[]|undefined} domains
 * @returns {Set<string>}
 */
function normalizeDomains(domains) {
  return new Set(
    (domains || [])
      .map((d) => String(d).trim().toLowerCase())
      .filter(Boolean)
      .map((d) => d.replace(/^https?:\/\//, '').replace(/\/$/, ''))
  );
}

/**
 * Find http(s) image URLs whose host matches one of the configured domains.
 * @param {string} source
 * @param {string[]} domains
 * @returns {string[]} unique URLs in encounter order
 */
function findRemoteImageUrls(source, domains) {
  const domainSet = normalizeDomains(domains);
  if (!domainSet.size || !source) {
    return [];
  }

  const urlRe = /https?:\/\/[^\s"'`)>\]]+/gi;
  const found = [];
  const seen = new Set();
  let match;
  while ((match = urlRe.exec(source)) !== null) {
    let raw = match[0];
    // Trim common trailing punctuation from markdown/prose
    raw = raw.replace(/[.,;:!?]+$/, '');
    if (!IMAGE_EXT_RE.test(raw)) {
      continue;
    }
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      continue;
    }
    const host = parsed.hostname.toLowerCase();
    const hostWithPort = parsed.port ? `${host}:${parsed.port}` : host;
    if (!domainSet.has(host) && !domainSet.has(hostWithPort)) {
      continue;
    }
    if (!seen.has(raw)) {
      seen.add(raw);
      found.push(raw);
    }
  }
  return found;
}

/**
 * Content-addressed asset filename under static/media.
 * @param {string} hash short content hash
 * @param {string} url
 * @returns {string}
 */
function assetFilenameFromHash(hash, url) {
  let ext = '.png';
  try {
    const pathname = new URL(url).pathname;
    const parsedExt = path.extname(pathname);
    if (parsedExt) {
      ext = parsedExt.toLowerCase();
    }
  } catch {
    // keep default
  }
  return `static/media/${hash}${ext}`;
}

/**
 * @param {Buffer|string} content buffer or precomputed hash
 * @param {string} url
 * @returns {string}
 */
function assetFilenameFor(content, url) {
  const hash =
    typeof content === 'string'
      ? content
      : crypto.createHash('md5').update(content).digest('hex').slice(0, 16);
  return assetFilenameFromHash(hash, url);
}

/**
 * Build a JS module that exports the markdown string with remote image URLs
 * replaced by relative asset paths (e.g. static/media/<hash>.png).
 * Relative paths resolve correctly for both http://localhost and Electron file://.
 *
 * @param {string} source
 * @param {Map<string, string>} urlToAssetPath map of original URL -> emitted asset path
 * @returns {string} JS module source
 */
function buildModuleSource(source, urlToAssetPath) {
  if (!urlToAssetPath.size) {
    return `export default ${JSON.stringify(source)};`;
  }

  let rewritten = source;
  // Replace longest URLs first so overlapping prefixes cannot break substitution
  const urls = [...urlToAssetPath.keys()].sort((a, b) => b.length - a.length);
  for (const url of urls) {
    rewritten = rewritten.split(url).join(urlToAssetPath.get(url));
  }

  return `export default ${JSON.stringify(rewritten)};`;
}

module.exports = {
  IMAGE_EXT_RE,
  normalizeDomains,
  findRemoteImageUrls,
  assetFilenameFor,
  assetFilenameFromHash,
  buildModuleSource
};
