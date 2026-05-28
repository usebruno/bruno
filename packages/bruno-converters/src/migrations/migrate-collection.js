/**
 * Collection-wide migration tool.
 *
 * Walks all .bru files in a collection directory, extracts script blocks,
 * runs the AST codemod on each, and produces a migration report.
 *
 * Can be used programmatically, via CLI, or wired into the UI.
 */

import { migrateScript, formatMigrationReport } from './migrate-script';

const fs = require('fs');
const path = require('path');

/**
 * Recursively find all .bru files in a directory.
 *
 * @param {string} dir - Directory to search
 * @returns {string[]} Array of absolute file paths
 */
export function findBruFiles(dir) {
  const results = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      results.push(...findBruFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.bru')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Extract script blocks from raw .bru file content.
 * Parses script:pre-request { ... } and script:post-response { ... } blocks.
 *
 * @param {string} content - Raw .bru file content
 * @returns {{ preRequest: { code: string, start: number, end: number } | null, postResponse: { code: string, start: number, end: number } | null }}
 */
export function extractScriptBlocks(content) {
  const blocks = { preRequest: null, postResponse: null };
  const patterns = [
    { key: 'preRequest', regex: /^script:pre-request\s*\{/m },
    { key: 'postResponse', regex: /^script:post-response\s*\{/m }
  ];

  for (const { key, regex } of patterns) {
    const match = regex.exec(content);
    if (!match) continue;

    const blockStart = match.index + match[0].length;
    let depth = 1;
    let i = blockStart;

    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') depth--;
      i++;
    }

    if (depth === 0) {
      const code = content.slice(blockStart, i - 1);
      blocks[key] = {
        code,
        start: blockStart,
        end: i - 1
      };
    }
  }

  return blocks;
}

/**
 * Replace a script block in the raw .bru content.
 *
 * @param {string} content - Original .bru file content
 * @param {{ start: number, end: number }} block - Block position from extractScriptBlocks
 * @param {string} newCode - New script code
 * @returns {string} Updated content
 */
export function replaceScriptBlock(content, block, newCode) {
  return content.slice(0, block.start) + newCode + content.slice(block.end);
}

/**
 * Migrate all scripts in a collection directory.
 *
 * @param {string} collectionDir - Path to the collection root
 * @param {string} fromVersion - Current API version
 * @param {string} toVersion - Target API version
 * @param {{ dryRun?: boolean }} options - Options
 * @returns {{ files: Array<{ path: string, changes: Array, error?: string }>, summary: { totalFiles: number, filesChanged: number, totalChanges: number } }}
 */
export function migrateCollection(collectionDir, fromVersion, toVersion, options = {}) {
  const { dryRun = false } = options;
  const bruFiles = findBruFiles(collectionDir);

  const results = {
    collectionDir,
    files: [],
    summary: {
      totalFiles: bruFiles.length,
      filesChanged: 0,
      totalChanges: 0
    }
  };

  for (const filePath of bruFiles) {
    const fileResult = { path: filePath, changes: [] };

    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const blocks = extractScriptBlocks(content);
      let modified = false;

      // Process post-response first (later in file) to preserve offsets
      for (const blockKey of ['postResponse', 'preRequest']) {
        const block = blocks[blockKey];
        if (!block || !block.code.trim()) continue;

        const { code: migratedCode, changes } = migrateScript(block.code, fromVersion, toVersion);
        if (changes.length > 0) {
          fileResult.changes.push(...changes.map((c) => ({ ...c, block: blockKey })));
          if (!dryRun) {
            content = replaceScriptBlock(content, block, migratedCode);
            modified = true;
          }
        }
      }

      if (modified && !dryRun) {
        fs.writeFileSync(filePath, content, 'utf-8');
      }

      if (fileResult.changes.length > 0) {
        results.summary.filesChanged++;
        results.summary.totalChanges += fileResult.changes.length;
      }
    } catch (err) {
      fileResult.error = err.message;
    }

    if (fileResult.changes.length > 0 || fileResult.error) {
      results.files.push(fileResult);
    }
  }

  return results;
}

/**
 * Format collection migration results as a human-readable report.
 * Paths are shown relative to the collection root for readability.
 *
 * @param {Object} results - Results from migrateCollection()
 * @returns {string}
 */
export function formatCollectionReport(results) {
  const collectionDir = results.collectionDir || '';

  const toRelative = (absPath) => {
    if (!collectionDir || !absPath.startsWith(collectionDir)) return absPath;
    const rel = absPath.slice(collectionDir.length).replace(/^[/\\]/, '');
    return rel || absPath;
  };

  const blockLabel = (block) => {
    if (block === 'preRequest') return 'pre-request';
    if (block === 'postResponse') return 'post-response';
    return block;
  };

  const { totalFiles, filesChanged, totalChanges } = results.summary;

  const lines = [
    `Scanned ${totalFiles} file(s), found ${totalChanges} deprecated call(s) in ${filesChanged} file(s).`,
    ''
  ];

  for (const file of results.files) {
    const relPath = toRelative(file.path);

    if (file.error) {
      lines.push(`[error] ${relPath}`);
      lines.push(`  ${file.error}`);
      lines.push('');
      continue;
    }

    lines.push(relPath);
    for (const change of file.changes) {
      const loc = change.line ? `:${change.line}` : '';
      const block = blockLabel(change.block);
      lines.push(`  ${block}${loc}  ${change.oldApi} -> ${change.newApi}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
