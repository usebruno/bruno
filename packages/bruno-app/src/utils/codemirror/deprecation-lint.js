/**
 * CodeMirror lint helper that detects deprecated Bruno API calls
 * and shows inline warnings with migration instructions.
 *
 * Driven by the migration registry -- same source of truth as the
 * AST codemod engine and runtime compatibility shim.
 */

import { getAllMigrations } from '@usebruno/converters/src/migrations/registry';

/**
 * Build regex patterns from the migration registry's simpleTranslations.
 * Pre-compiled once for O(1) matching per line.
 */
function buildDeprecationPatterns(migrations) {
  const patterns = [];

  for (const migration of migrations) {
    for (const [oldApi, newApi] of Object.entries(migration.simpleTranslations)) {
      // Escape dots for regex, match as word boundary
      const escaped = oldApi.replace(/\./g, '\\.');
      patterns.push({
        regex: new RegExp(`\\b${escaped}\\b`, 'g'),
        oldApi,
        newApi,
        doc: migration.docs[oldApi] || null,
        migrationId: migration.id
      });
    }
  }

  return patterns;
}

// Pre-compute patterns from the registry
const DEPRECATION_PATTERNS = buildDeprecationPatterns(getAllMigrations());

/**
 * Scan script text for deprecated API usage.
 * Returns CodeMirror-compatible lint annotations (severity: 'warning').
 *
 * @param {string} text - The script content
 * @returns {Array<{ from: {line, ch}, to: {line, ch}, message: string, severity: string }>}
 */
export function findDeprecatedUsage(text) {
  if (!text || DEPRECATION_PATTERNS.length === 0) return [];

  const found = [];
  const lines = text.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // Skip comment lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }

    for (const pattern of DEPRECATION_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(line)) !== null) {
        const doc = pattern.doc;
        const reason = doc?.reason ? ` (${doc.reason})` : '';
        found.push({
          from: { line: lineIndex, ch: match.index },
          to: { line: lineIndex, ch: match.index + match[0].length },
          message: `Deprecated: ${pattern.oldApi} -> ${pattern.newApi}${reason}`,
          severity: 'warning'
        });
      }
    }
  }

  return found;
}

export { buildDeprecationPatterns, DEPRECATION_PATTERNS };
