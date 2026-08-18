const fs = require('node:fs');
const path = require('node:path');

// .js listed first so a compiled JS artifact wins over its TypeScript source.
// .tsx/.jsx are deliberately absent: collection scripts have no JSX runtime.
// .cts/.mts are reachable through an explicit extension or the .cjs/.mjs
// mapping below.
const MODULE_FILE_EXTENSIONS = ['.js', '.ts'];
const INDEX_FILES = ['index.js', 'index.ts'];

// TypeScript sources are commonly imported with their output extension
// (ESM/TS convention: `import './helper.js'` for helper.ts)
const JS_TO_TS_EXTENSIONS = {
  '.js': ['.ts'],
  '.cjs': ['.cts'],
  '.mjs': ['.mts']
};

const isFile = (candidatePath) => {
  try {
    return fs.statSync(candidatePath).isFile();
  } catch {
    return false;
  }
};

/**
 * Resolve an absolute module base path to an existing file, extending the
 * Node.js file-resolution steps with TypeScript sources:
 * 1. Exact path (with extension), falling back to the matching TypeScript
 *    file when a .js/.cjs/.mjs request has no JS file on disk
 * 2. Path + known extension (.js, .ts)
 * Directory handling (package.json main, index files) is the caller's
 * responsibility — each sandbox composes the directory steps it supports.
 * @param {string} basePath - Absolute path, with or without extension
 * @returns {string|null} Path of the first existing file candidate, or null
 */
function resolveModuleFile(basePath) {
  const extension = path.extname(basePath);

  // 1. Exact path with TypeScript fallbacks
  if (extension) {
    if (isFile(basePath)) {
      return basePath;
    }

    const tsExtensions = JS_TO_TS_EXTENSIONS[extension.toLowerCase()] || [];
    const stem = basePath.slice(0, -extension.length);
    for (const tsExtension of tsExtensions) {
      if (isFile(stem + tsExtension)) {
        return stem + tsExtension;
      }
    }

    // A dot in the basename is not necessarily an extension ('./config.helper'),
    // so Node.js still appends its known extensions — fall through
  }

  // 2. Try known extensions
  for (const candidateExtension of MODULE_FILE_EXTENSIONS) {
    const fullFilePath = basePath + candidateExtension;
    if (isFile(fullFilePath)) {
      return fullFilePath;
    }
  }

  return null;
}

/**
 * Resolve a directory module through its index file (index.js, index.ts)
 * @param {string} basePath - Absolute path of the directory
 * @returns {string|null} Path of the first existing index file, or null
 */
function resolveDirectoryIndex(basePath) {
  if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory()) {
    return null;
  }

  for (const indexFile of INDEX_FILES) {
    const indexPath = path.join(basePath, indexFile);
    if (isFile(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

module.exports = {
  isFile,
  resolveModuleFile,
  resolveDirectoryIndex
};
