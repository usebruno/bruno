/**
 * Migration Registry - Single source of truth for Bruno API version changes.
 *
 * Each entry defines a set of API changes for a specific version bump.
 * Consumers (AST codemod, runtime shim, editor lint, migration report)
 * all derive their behavior from this registry.
 *
 * Shape mirrors postman-to-bruno-translator.js simpleTranslations/complexTransformations
 * for maximum infrastructure reuse.
 */

export const migrations = [
  {
    id: 'env-namespace-v2',
    fromVersion: '1',
    toVersion: '2',
    description: 'Environment variable APIs moved under bru.env namespace',

    // Simple 1:1 member expression renames (same shape as postman translator)
    simpleTranslations: {
      'bru.getEnvVar': 'bru.env.get',
      'bru.setEnvVar': 'bru.env.set',
      'bru.hasEnvVar': 'bru.env.has',
      'bru.deleteEnvVar': 'bru.env.delete',
      'bru.getAllEnvVars': 'bru.env.getAll',
      'bru.deleteAllEnvVars': 'bru.env.deleteAll',
      'bru.getEnvName': 'bru.env.getName'
    },

    // Complex transformations for signature changes
    // Same interface as complexTransformationsMap in postman-to-bruno-translator.js:
    //   { pattern: string, transform: (path, j) => ASTNode }
    complexTransformations: [],

    // Documentation for each deprecated API (drives editor tooltips and migration reports)
    docs: {
      'bru.getEnvVar': {
        reason: 'Grouped under bru.env namespace for consistency',
        migration: 'Replace bru.getEnvVar(key) with bru.env.get(key)'
      },
      'bru.setEnvVar': {
        reason: 'Grouped under bru.env namespace for consistency',
        migration: 'Replace bru.setEnvVar(key, value) with bru.env.set(key, value)'
      },
      'bru.hasEnvVar': {
        reason: 'Grouped under bru.env namespace for consistency',
        migration: 'Replace bru.hasEnvVar(key) with bru.env.has(key)'
      },
      'bru.deleteEnvVar': {
        reason: 'Grouped under bru.env namespace for consistency',
        migration: 'Replace bru.deleteEnvVar(key) with bru.env.delete(key)'
      },
      'bru.getAllEnvVars': {
        reason: 'Grouped under bru.env namespace for consistency',
        migration: 'Replace bru.getAllEnvVars() with bru.env.getAll()'
      },
      'bru.deleteAllEnvVars': {
        reason: 'Grouped under bru.env namespace for consistency',
        migration: 'Replace bru.deleteAllEnvVars() with bru.env.deleteAll()'
      },
      'bru.getEnvName': {
        reason: 'Grouped under bru.env namespace for consistency',
        migration: 'Replace bru.getEnvName() with bru.env.getName()'
      }
    }
  }
];

/**
 * Get all migrations applicable between two versions.
 * Returns migrations in order from oldest to newest.
 *
 * @param {string} fromVersion - Current API version (e.g., '1')
 * @param {string} toVersion - Target API version (e.g., '2')
 * @returns {Array} Applicable migration entries
 */
export function getApplicableMigrations(fromVersion, toVersion) {
  const from = parseInt(fromVersion, 10);
  const to = parseInt(toVersion, 10);

  if (isNaN(from) || isNaN(to) || from >= to) {
    return [];
  }

  return migrations.filter((m) => {
    const mFrom = parseInt(m.fromVersion, 10);
    const mTo = parseInt(m.toVersion, 10);
    return mFrom >= from && mTo <= to;
  });
}

/**
 * Get the current (latest) API version from the registry.
 * @returns {string}
 */
export function getCurrentVersion() {
  if (migrations.length === 0) return '1';
  const versions = migrations.map((m) => parseInt(m.toVersion, 10));
  return String(Math.max(...versions));
}

/**
 * Get all migrations in the registry.
 * @returns {Array}
 */
export function getAllMigrations() {
  return migrations;
}
