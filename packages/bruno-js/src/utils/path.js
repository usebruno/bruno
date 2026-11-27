const path = require('node:path');

/**
 * Check whether a path returned by `path.relative(root, target)` points outside `root`.
 *
 * Only a real parent traversal (`..` or `..` followed by a separator) or an absolute path
 * (different drive on Windows) leaves the root. A file name that merely begins with `..`,
 * such as `..private.js`, is still inside it.
 *
 * @param {string} relativePath - Result of `path.relative(root, target)`
 * @returns {boolean} True if the target is outside the root
 */
const isRelativePathOutsideRoot = (relativePath) => {
  return relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath);
};

module.exports = {
  isRelativePathOutsideRoot
};
