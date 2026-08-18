const path = require('node:path');

const TYPESCRIPT_EXTENSIONS = ['.ts', '.tsx', '.cts', '.mts'];

let sucraseTransform;

/**
 * Check if a file is a TypeScript source file
 * @param {string} filePath - File path to check
 * @returns {boolean} True if the file has a TypeScript extension
 */
function isTypeScriptFile(filePath) {
  return TYPESCRIPT_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

/**
 * Transpile TypeScript source to CommonJS JavaScript.
 *
 * Uses sucrase: pure JS and synchronous (no native binary to repackage in
 * Electron), and it preserves line numbers so stack traces map back to the
 * original TypeScript source without source maps. This is type *stripping*
 * only — no type checking is performed.
 *
 * @param {string} source - TypeScript source code
 * @param {string} filePath - Absolute path of the source file (for error messages)
 * @returns {string} Transpiled CommonJS JavaScript
 * @throws {Error} When the source cannot be parsed
 */
function transpileTypeScript(source, filePath) {
  if (!sucraseTransform) {
    // Lazy-load so pure-JS collections never pay the cost of loading sucrase
    sucraseTransform = require('sucrase').transform;
  }

  try {
    return sucraseTransform(source, {
      transforms: ['typescript', 'imports'],
      filePath,
      disableESTransforms: true
    }).code;
  } catch (error) {
    throw new Error(`Failed to transpile TypeScript file ${filePath}: ${error.message}`);
  }
}

module.exports = {
  isTypeScriptFile,
  transpileTypeScript
};
