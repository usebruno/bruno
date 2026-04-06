const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { openApiToBruno } = require('@usebruno/converters');
const { parseRequest, stringifyRequest } = require('@usebruno/filestore');
const {
  buildSpecItemsMap,
  compareRequestFields,
  normalizeUrlPath,
  mergeSpecIntoRequest,
  isPathInsideCollection
} = require('@usebruno/common/sync');
const { sanitizeName } = require('../utils/filesystem');

const RESERVED_FOLDER_NAMES = ['node_modules', '.git', 'environments'];

/**
 * Find a request file on disk by HTTP method and normalized URL path.
 * Scans .bru/.yml files recursively.
 */
const findRequestFileOnDisk = (dirPath, method, urlPath, format) => {
  const ext = format === 'yml' ? '.yml' : '.bru';
  if (!fs.existsSync(dirPath)) return null;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory() && !['node_modules', '.git', 'environments'].includes(file)) {
      const found = findRequestFileOnDisk(filePath, method, urlPath, format);
      if (found) return found;
    } else if (file.endsWith(ext)) {
      if (file.startsWith('folder.') || file.startsWith('collection.')) continue;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const request = parseRequest(content, { format });
        if (request?.request) {
          const reqMethod = request.request.method?.toUpperCase();
          const reqPath = normalizeUrlPath(request.request.url);
          if (reqMethod === method && reqPath === urlPath) {
            return { filePath, request, content };
          }
        }
      } catch {
        // Skip files that can't be parsed
      }
    }
  }
  return null;
};

/**
 * Ensure a folder exists for a tag-based grouping.
 * Creates the folder and its folder metadata file if missing.
 */
const ensureFolder = async (collectionPath, folderName, format) => {
  const safeFolderName = sanitizeName(folderName);
  if (RESERVED_FOLDER_NAMES.some((r) => r.toLowerCase() === safeFolderName.toLowerCase())) {
    return collectionPath;
  }
  const targetFolder = path.join(collectionPath, safeFolderName);
  if (!isPathInsideCollection(targetFolder, collectionPath)) {
    return collectionPath;
  }
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
    const folderFile = format === 'yml' ? 'folder.yml' : 'folder.bru';
    const folderBruPath = path.join(targetFolder, folderFile);
    // Write a minimal folder metadata file
    if (format === 'yml') {
      fs.writeFileSync(folderBruPath, `info:\n  name: ${safeFolderName}\n`, 'utf8');
    } else {
      fs.writeFileSync(folderBruPath, `meta {\n  name: ${safeFolderName}\n}\n`, 'utf8');
    }
  }
  return targetFolder;
};

/**
 * Apply fixes based on a drift report.
 * Scaffolds missing requests, updates modified ones, optionally removes stale ones.
 *
 * @param {Object} spec - Parsed OpenAPI 3.x spec
 * @param {Object} collection - Bruno collection from disk
 * @param {Object} driftReport - Output from computeDrift
 * @param {Object} options - { dryRun, removeStale, groupBy, format }
 * @returns {Object} { created, updated, removed, errors }
 */
const applyFixes = async (spec, collection, driftReport, options = {}) => {
  const { dryRun = false, removeStale = false, groupBy = 'tags' } = options;
  const collectionPath = collection.pathname;
  const format = collection.format || 'bru';

  // Convert spec to Bruno format to get the full request objects
  const specAsCollection = openApiToBruno(spec, { groupBy });
  const specItemsMap = buildSpecItemsMap(specAsCollection.items || []);

  const results = { created: [], updated: [], removed: [], errors: [] };

  // Handle missing endpoints — scaffold new request files
  for (const item of driftReport.missing) {
    const id = `${item.method}:${item.path}`;
    const specItem = specItemsMap.get(id);
    if (!specItem) continue;

    try {
      const targetFolder = specItem.folderName
        ? await ensureFolder(collectionPath, specItem.folderName, format)
        : collectionPath;
      const fileName = sanitizeName(specItem.name || `${item.method} ${item.path}`);
      const ext = format === 'yml' ? '.yml' : '.bru';
      const filePath = path.join(targetFolder, `${fileName}${ext}`);

      if (dryRun) {
        console.log(chalk.dim(`  Would create: ${path.relative(collectionPath, filePath)}`));
      } else {
        const content = await stringifyRequest(specItem, { format });
        fs.writeFileSync(filePath, content, 'utf8');
      }
      results.created.push({ method: item.method, path: item.path, filePath });
    } catch (err) {
      results.errors.push({ method: item.method, path: item.path, error: err.message });
    }
  }

  // Handle modified endpoints — merge spec changes, preserve user content
  for (const item of driftReport.modified) {
    const id = `${item.method}:${item.path}`;
    const specItem = specItemsMap.get(id);
    if (!specItem) continue;

    try {
      const existing = findRequestFileOnDisk(collectionPath, item.method, item.path, format);
      if (!existing) {
        results.errors.push({ method: item.method, path: item.path, error: 'Could not find existing file on disk' });
        continue;
      }

      const mergedRequest = mergeSpecIntoRequest(existing.request, specItem);

      if (dryRun) {
        console.log(chalk.dim(`  Would update: ${path.relative(collectionPath, existing.filePath)}  (${item.changes})`));
      } else {
        const content = await stringifyRequest(mergedRequest, { format });
        fs.writeFileSync(existing.filePath, content, 'utf8');
      }
      results.updated.push({ method: item.method, path: item.path, filePath: existing.filePath, changes: item.changes });
    } catch (err) {
      results.errors.push({ method: item.method, path: item.path, error: err.message });
    }
  }

  // Handle stale endpoints
  if (removeStale) {
    for (const item of driftReport.stale) {
      try {
        const existing = findRequestFileOnDisk(collectionPath, item.method, item.path, format);
        if (!existing) continue;

        if (dryRun) {
          console.log(chalk.dim(`  Would delete: ${path.relative(collectionPath, existing.filePath)}`));
        } else {
          fs.unlinkSync(existing.filePath);
        }
        results.removed.push({ method: item.method, path: item.path, filePath: existing.filePath });
      } catch (err) {
        results.errors.push({ method: item.method, path: item.path, error: err.message });
      }
    }
  }

  return results;
};

module.exports = { applyFixes };
