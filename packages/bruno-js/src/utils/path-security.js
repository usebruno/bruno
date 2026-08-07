const path = require('node:path');

/**
 * Check that a path is inside a root directory (lexically — symlinks are not
 * resolved, matching how allowed roots such as npm-linked packages are declared)
 * @param {string} root - Root directory
 * @param {string} candidatePath - Path to validate
 * @returns {boolean} True if candidatePath is within root
 */
function isPathWithinRoot(root, candidatePath) {
  const relativePath = path.relative(path.normalize(root), candidatePath);
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

/**
 * Validate that a path is within at least one allowed root
 * @param {string} normalizedPath - Normalized file path
 * @param {Array<string>} allowedRoots - Allowed root directories
 * @returns {boolean} True if path is within an allowed root
 */
function isPathWithinAllowedRoots(normalizedPath, allowedRoots) {
  return allowedRoots.some((allowedRoot) => isPathWithinRoot(allowedRoot, normalizedPath));
}

module.exports = {
  isPathWithinRoot,
  isPathWithinAllowedRoots
};
