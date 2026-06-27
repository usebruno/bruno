/**
 * Returns the path of an item relative to its collection root, using forward
 * slashes so the value stays portable when written into bruno.json (which can
 * be committed and shared across operating systems).
 *
 * @param {string} collectionPathname absolute path of the collection root
 * @param {string} itemPathname absolute path of the item (folder) being ignored
 * @returns {string} the collection-relative path, or '' when it cannot be derived
 */
export const getCollectionRelativePath = (collectionPathname, itemPathname) => {
  if (!collectionPathname || !itemPathname) return '';

  const toPosix = (p) => p.replace(/\\/g, '/').replace(/\/+$/, '');
  const root = toPosix(collectionPathname);
  const target = toPosix(itemPathname);

  if (target === root) return '';
  if (target.startsWith(`${root}/`)) {
    return target.slice(root.length + 1);
  }

  return target;
};

/**
 * Returns a new brunoConfig with the given path added to its `ignore` list.
 * The original config and its ignore array are left untouched. Empty paths and
 * paths already present are no-ops.
 *
 * @param {Object} brunoConfig the collection's bruno.json config
 * @param {string} relativePath the collection-relative path to ignore
 * @returns {Object} a new brunoConfig with the updated ignore list
 */
export const addPathToIgnoreList = (brunoConfig, relativePath) => {
  const config = brunoConfig ? { ...brunoConfig } : {};
  const ignore = Array.isArray(config.ignore) ? [...config.ignore] : [];

  if (relativePath && !ignore.includes(relativePath)) {
    ignore.push(relativePath);
  }

  config.ignore = ignore;
  return config;
};
