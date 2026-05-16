/**
 * AST-based codemod engine for migrating Bruno scripts between API versions.
 *
 * Reuses the exact same traversal pattern as processTransformations()
 * in postman-to-bruno-translator.js (lines 529-582):
 * - Single AST pass over all MemberExpression nodes
 * - O(1) lookup via object property check
 * - Tracks transformed nodes to avoid double-processing
 *
 * Additionally tracks every change made, enabling migration reports.
 */

import { getMemberExpressionString, buildMemberExpressionFromString } from '../utils/ast-utils';
import { getApplicableMigrations } from './registry';
const j = require('jscodeshift');

/**
 * Migrate a Bruno script from one API version to another.
 *
 * @param {string} code - The script source code
 * @param {string} fromVersion - Current API version (e.g., '1')
 * @param {string} toVersion - Target API version (e.g., '2')
 * @returns {{ code: string, changes: Array<{ line: number|null, oldApi: string, newApi: string, doc: object|null }> }}
 */
export function migrateScript(code, fromVersion, toVersion) {
  if (!code || !code.trim()) {
    return { code: code || '', changes: [] };
  }

  const applicableMigrations = getApplicableMigrations(fromVersion, toVersion);
  if (applicableMigrations.length === 0) {
    return { code, changes: [] };
  }

  // Merge all simple translations into one lookup map
  const mergedSimple = {};
  const mergedComplex = {};
  const mergedDocs = {};

  for (const migration of applicableMigrations) {
    Object.assign(mergedSimple, migration.simpleTranslations);
    for (const ct of migration.complexTransformations) {
      mergedComplex[ct.pattern] = ct;
    }
    Object.assign(mergedDocs, migration.docs);
  }

  const ast = j(code);
  const transformedNodes = new Set();
  const changes = [];

  // Same traversal as postman-to-bruno-translator.js processTransformations()
  ast.find(j.MemberExpression).forEach((path) => {
    if (transformedNodes.has(path.node)) return;

    const memberExprStr = getMemberExpressionString(path.value);

    // Simple translations (O(1) lookup)
    if (mergedSimple.hasOwnProperty(memberExprStr)) {
      const replacement = mergedSimple[memberExprStr];
      const line = path.value.loc ? path.value.loc.start.line : null;

      changes.push({
        line,
        oldApi: memberExprStr,
        newApi: replacement,
        doc: mergedDocs[memberExprStr] || null
      });

      j(path).replaceWith(buildMemberExpressionFromString(replacement));
      transformedNodes.add(path.node);
      return;
    }

    // Complex transformations (O(1) lookup)
    if (mergedComplex.hasOwnProperty(memberExprStr)) {
      const parentType = path.parent.value.type;
      const line = path.value.loc ? path.value.loc.start.line : null;

      if (parentType === 'CallExpression') {
        const transform = mergedComplex[memberExprStr];
        const replacement = transform.transform(path, j);

        changes.push({
          line,
          oldApi: memberExprStr,
          newApi: transform.replacementName || '[complex]',
          doc: mergedDocs[memberExprStr] || null
        });

        if (Array.isArray(replacement)) {
          const parentPath = path.parent;
          const grandParentPath = parentPath.parent;
          j(parentPath).replaceWith(replacement[0]);
          transformedNodes.add(replacement[0]);
          transformedNodes.add(parentPath.node);
          for (let i = replacement.length - 1; i >= 1; i--) {
            j(grandParentPath).insertAfter(replacement[i]);
            transformedNodes.add(replacement[i]);
          }
        } else {
          j(path.parent).replaceWith(replacement);
          transformedNodes.add(path.node);
          transformedNodes.add(path.parent.node);
        }
      } else if (parentType === 'ExpressionStatement') {
        const transform = mergedComplex[memberExprStr];
        const replacement = transform.transform(path, j);

        changes.push({
          line,
          oldApi: memberExprStr,
          newApi: transform.replacementName || '[complex]',
          doc: mergedDocs[memberExprStr] || null
        });

        j(path).replaceWith(replacement);
        transformedNodes.add(path.node);
      }
    }
  });

  return {
    code: ast.toSource(),
    changes
  };
}

/**
 * Check a script for deprecated API usage without transforming it.
 * Useful for linting / reporting without modifying files.
 *
 * @param {string} code - The script source code
 * @param {string} fromVersion - Current API version
 * @param {string} toVersion - Target API version
 * @returns {Array<{ line: number|null, oldApi: string, newApi: string, doc: object|null }>}
 */
export function detectDeprecatedUsage(code, fromVersion, toVersion) {
  if (!code || !code.trim()) {
    return [];
  }

  const applicableMigrations = getApplicableMigrations(fromVersion, toVersion);
  if (applicableMigrations.length === 0) {
    return [];
  }

  const mergedSimple = {};
  const mergedComplex = {};
  const mergedDocs = {};

  for (const migration of applicableMigrations) {
    Object.assign(mergedSimple, migration.simpleTranslations);
    for (const ct of migration.complexTransformations) {
      mergedComplex[ct.pattern] = ct;
    }
    Object.assign(mergedDocs, migration.docs);
  }

  const ast = j(code);
  const findings = [];

  ast.find(j.MemberExpression).forEach((path) => {
    const memberExprStr = getMemberExpressionString(path.value);
    const line = path.value.loc ? path.value.loc.start.line : null;

    if (mergedSimple.hasOwnProperty(memberExprStr)) {
      findings.push({
        line,
        oldApi: memberExprStr,
        newApi: mergedSimple[memberExprStr],
        doc: mergedDocs[memberExprStr] || null
      });
    } else if (mergedComplex.hasOwnProperty(memberExprStr)) {
      findings.push({
        line,
        oldApi: memberExprStr,
        newApi: mergedComplex[memberExprStr].replacementName || '[complex]',
        doc: mergedDocs[memberExprStr] || null
      });
    }
  });

  return findings;
}

/**
 * Generate a human-readable migration report for a script.
 *
 * @param {Array} changes - Changes array from migrateScript()
 * @returns {string} Formatted report
 */
export function formatMigrationReport(changes) {
  if (changes.length === 0) {
    return 'No deprecated APIs found.';
  }

  const lines = [`Found ${changes.length} deprecated API usage(s):\n`];

  for (const change of changes) {
    const lineInfo = change.line ? `Line ${change.line}: ` : '';
    lines.push(`  ${lineInfo}${change.oldApi} -> ${change.newApi}`);
    if (change.doc) {
      if (change.doc.reason) lines.push(`    Reason: ${change.doc.reason}`);
      if (change.doc.migration) lines.push(`    Fix: ${change.doc.migration}`);
    }
  }

  return lines.join('\n');
}
