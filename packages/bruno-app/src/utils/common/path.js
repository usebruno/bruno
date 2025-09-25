import platform from 'platform';
import path from 'path';

const isWindowsOS = () => {
    const os = platform.os;
    const osFamily = os.family.toLowerCase();
    return osFamily.includes('windows');
};

const brunoPath = isWindowsOS() ? path.win32 : path.posix;

/**
 * Get a relative path from one location to another.
 *
 * This function attempts to compute the relative path between two given paths
 *
 * @param {string} fromPath - The starting path.
 * @param {string} toPath - The target path.
 * @returns {string} The relative path from `fromPath` to `toPath`, `"."` if both are the same,
 *                   or `toPath` if resolution fails.
 *
 * @example
 * Assuming current dir: /users/john/projects
 * getRelativePath('/users/john/projects', '/users/john/projects/app');
 *  → "app"
 *
 * @example
 * getRelativePath('/users/john/projects', '/users/john/projects');
 *  → "."
 *
 * @example
 * getRelativePath('/users/john/projects', '/users/john/docs/readme.md');
 *  → "../docs/readme.md"
 */
const getRelativePath = (fromPath, toPath) => {
  try {
    const relativePath = brunoPath.relative(fromPath, toPath);

    if (relativePath === '') {
      return '.';
    }

    return relativePath || toPath;
  } catch (error) {
    return toPath;
  }
};

/**
 * Get the basename (filename) of a file from a relative path.
 *
 * This function resolves a relative path against a base path and returns
 * just the filename portion. It handles cross-platform path separators
 * and returns an empty string for invalid inputs.
 *
 * @param {string} basePath - The base path to resolve against (e.g., "/users/john/projects")
 * @param {string} relativePath - The relative path to resolve (e.g., "../docs/file.txt")
 * @returns {string} The basename of the resolved path, or empty string if relativePath is falsy
 *
 * @example
 * getBasename("/users/john/projects", "../docs/readme.md");
 *  → "readme.md"
 *
 * @example
 * getBasename("/users/john/projects", "subfolder/config.json");
 *  → "config.json"
 *
 * @example
 * getBasename("/users/john/projects", "..");
 *  → "john"
 *
 * @example
 * getBasename("/users/john/projects", ".");
 *  → "projects"
 */
const getBasename = (basePath, relativePath) => {
  if (!relativePath) {
    return '';
  }

  const resolvedPath = brunoPath.resolve(basePath, relativePath);
  const basename = brunoPath.basename(resolvedPath);

  return basename;
};

/**
 * Resolve a relative file path against a base path to get an absolute file path.
 *
 * This function resolves a relative path against a base path using the appropriate
 * path resolution method for the current platform (Windows or Unix). It handles
 * cross-platform path separators and returns a normalized absolute path.
 *
 * @param {string} basePath - The base path to resolve against (e.g., "/users/john/collections" or "C:\\Users\\John\\Collections")
 * @param {string} relativePath - The relative path to resolve (e.g., "config/settings.json" or "config\\settings.json")
 * @returns {string} The resolved absolute file path
 *
 * @example
 * Basic relative path resolution
 * getAbsoluteFilePath('/users/john/collections', 'config/settings.json');
 * → "/users/john/collections/config/settings.json"
 *
 * @example
 * Handle parent directory references
 * getAbsoluteFilePath('/users/john/collections/api', '../shared/config.json');
 * → "/users/john/collections/shared/config.json"
 *
 * @example
 * Handle current directory reference
 * getAbsoluteFilePath('/users/john/collections', './local-file.json');
 * → "/users/john/collections/local-file.json"
 */
const getAbsoluteFilePath = (basePath, relativePath) => {
  return brunoPath.resolve(basePath, relativePath);
};

export default brunoPath;
export { getRelativePath, getBasename, getAbsoluteFilePath };
