/**
 * Shared utilities for OpenAPI parsing and diffing
 */

export const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * Normalizes an OpenAPI path to Bruno format
 * - Converts {param} to :param
 * - Removes duplicate slashes
 * - Removes trailing slash
 * @param {string} path - The OpenAPI path
 * @returns {string} The normalized path
 */
export const normalizePath = (path) => {
  if (!path) return '';
  return path
    .replace(/{([^}]+)}/g, ':$1')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
};
