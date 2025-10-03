import platform from 'platform';
import path from 'path';

const isWindowsOS = () => {
    const os = platform.os;
    const osFamily = os.family.toLowerCase();
    return osFamily.includes('windows');
};

/**
 * Cross-Platform Path Standardization for Bruno Configuration Files
 *
 * Bruno stores relative paths in configuration files (bruno.json) that are committed to version control.
 * This creates cross-platform compatibility challenges when Windows and Unix users collaborate on the same project.
 *
 * PROBLEM:
 * - Windows users naturally create paths with backslashes (e.g., "certs\\client.pem")
 * - Unix systems don't recognize backslashes as path separators
 * - When a Windows user commits a bruno.json with Windows-style paths, Unix users cannot resolve these paths
 * - This forces manual path conversion before git commits, which is error-prone and inconvenient
 *
 * SOLUTION:
 * - Standardize all stored paths to POSIX format (forward slashes) across all platforms
 * - Windows natively supports forward slashes as valid path separators
 * - Use the posixify parameter to ensure consistent path storage
 * - This enables seamless collaboration between Windows and Unix developers
 *
 * IMPLEMENTATION:
 * - Always enable posixify by default when storing paths in configuration files
 * - Client certificates, protobuf files, and other relative paths should use POSIX format
 * - Both platforms can then resolve the same paths accurately without manual intervention
 *
 * BENEFITS:
 * - No manual path conversion required before git commits
 * - Consistent behavior across all platforms
 * - Improved developer experience for cross-platform teams
 * - Reduced git conflicts and merge issues related to path differences
 */
/** @param {string} str */
const posixify = (str) => {
  return str.replace(/\\/g, '/');
};

const brunoPath = isWindowsOS() ? path.win32 : path.posix;

/**
 * Get a relative path from one location to another.
 *
 * This function attempts to compute the relative path between two given paths
 *
 * @param {string} fromPath - The starting path.
 * @param {string} toPath - The target path.
 * @param {boolean} [shouldPosixify=true] - Whether to convert backslashes to forward slashes for cross-platform compatibility.
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
 *
 * @example
 * On Windows with posixify enabled
 * getRelativePath('C:\\Users\\John\\Projects', 'C:\\Users\\John\\Docs\\readme.md', true);
 *  → "../Docs/readme.md"
 */
const getRelativePath = (fromPath, toPath, shouldPosixify = true) => {
  try {
    const relativePath = brunoPath.relative(fromPath, toPath);

    if (relativePath === '') {
      return '.';
    }

    const result = relativePath || toPath;

    return shouldPosixify ? posixify(result) : result;
  } catch (error) {
    return shouldPosixify ? posixify(toPath) : toPath;
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
 * @param {boolean} [shouldPosixify=false] - Whether to convert backslashes to forward slashes for cross-platform compatibility.
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
 *
 * @example
 * On Windows with posixify enabled
 * getAbsoluteFilePath('C:\\Users\\John\\Collections', 'config\\settings.json', true);
 * → "C:/Users/John/Collections/config/settings.json"
 */
const getAbsoluteFilePath = (basePath, relativePath, shouldPosixify = false) => {
  const result = brunoPath.resolve(basePath, relativePath);
  return shouldPosixify ? posixify(result) : result;
};

export default brunoPath;
export { getRelativePath, getBasename, getAbsoluteFilePath };
