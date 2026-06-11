import path from 'path';

/**
 * Normalize a Bruno request URL down to a comparable path.
 * Strips template variables ({{baseUrl}}), protocol/host, query params,
 * converts {param} to :param, collapses slashes, removes trailing slash.
 */
export const normalizeUrlPath = (urlStr: string): string => {
  if (!urlStr) return '';
  return urlStr
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/\?.*$/, '')
    .replace(/{([^}]+)}/g, ':$1')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
};

/**
 * Validate that a target path is inside the collection directory.
 * Prevents path traversal attacks via ../../ in user-supplied paths.
 */
export const isPathInsideCollection = (targetPath: string, collectionPath: string): boolean => {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedCollection = path.resolve(collectionPath);
  return resolvedTarget.startsWith(resolvedCollection + path.sep) || resolvedTarget === resolvedCollection;
};
