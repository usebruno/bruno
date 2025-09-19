/**
 * Filesystem utilities for the renderer process
 * These functions communicate with the main process via IPC
 */

/**
 * Check if a file exists
 * @param {string} filePath - The file path to check
 * @returns {Promise<boolean>} - True if file exists, false otherwise
 */
export const existsSync = async (filePath) => {
  try {
    return await window?.ipcRenderer?.invoke('renderer:exists-sync', filePath);
  } catch (error) {
    console.error('Error checking if file exists:', error);
    return false;
  }
};

/**
 * Resolve a relative path against a base path
 * @param {string} relativePath - The relative path to resolve
 * @param {string} basePath - The base path to resolve against
 * @returns {Promise<string>} - The resolved absolute path
 */
export const resolvePath = async (relativePath, basePath) => {
  try {
    return await window?.ipcRenderer?.invoke('renderer:resolve-path', relativePath, basePath);
  } catch (error) {
    console.error('Error resolving path:', error);
    return relativePath;
  }
}; 