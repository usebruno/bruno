import * as v1 from './v1';

/**
 * Snapshot Schema Registry
 *
 * This module provides versioned schema validation and migration for app snapshots.
 *
 * To add a new version:
 * 1. Create schema/v{N}.js with { schema, migrate } exports
 * 2. Import and add to the `versions` array below
 * 3. Implement the `migrate` function in the previous version (v{N-1}.js)
 *
 * The migrate function in each version file transforms that version to the next.
 * For example, v1.migrate transforms a v1 snapshot into a v2 snapshot.
 */

/**
 * All schema versions in order.
 * Each entry contains { schema, migrate } where migrate transforms to the next version.
 */
const versions = [v1];

/**
 * The current (latest) schema version number.
 */
export const CURRENT_VERSION = versions.length;

/**
 * Get schema for a specific version.
 * @param {number} version - The version number (1-indexed)
 * @returns {import('zod').ZodSchema} The Zod schema for that version
 */
const getSchema = (version) => {
  const index = version - 1;
  if (index < 0 || index >= versions.length) {
    return null;
  }
  return versions[index].schema;
};

/**
 * Get migration function for a specific version.
 * @param {number} version - The version to migrate FROM
 * @returns {Function|null} Migration function, or null if no migration exists
 */
const getMigration = (version) => {
  const index = version - 1;
  if (index < 0 || index >= versions.length) {
    return null;
  }
  return versions[index].migrate;
};

/**
 * Validate a snapshot against the current (latest) schema.
 * Use this when saving snapshots to ensure they conform to the expected structure.
 *
 * @param {object} snapshot - The snapshot to validate
 * @returns {object} The validated snapshot (with defaults applied)
 * @throws {import('zod').ZodError} If validation fails
 */
export const validateSnapshot = (snapshot) => {
  const currentSchema = getSchema(CURRENT_VERSION);
  return currentSchema.parse(snapshot);
};

/**
 * Validate a snapshot against the current schema without throwing.
 *
 * @param {object} snapshot - The snapshot to validate
 * @returns {{ success: true, data: object } | { success: false, error: import('zod').ZodError }}
 */
export const safeValidateSnapshot = (snapshot) => {
  const currentSchema = getSchema(CURRENT_VERSION);
  return currentSchema.safeParse(snapshot);
};

/**
 * Load and migrate a snapshot to the current version.
 * Use this when loading snapshots from storage.
 *
 * @param {object} data - The raw snapshot data from storage
 * @returns {object} A validated snapshot at the current version
 * @throws {Error} If the snapshot version is unknown or migration fails
 */
export const loadAndMigrateSnapshot = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('[app-snapshot] Invalid snapshot data');
  }

  // Default to version 1 for backwards compatibility with unversioned snapshots
  let snapshot = { ...data };
  if (snapshot.version === undefined) {
    snapshot.version = 1;
  }

  const sourceVersion = snapshot.version;

  // Validate version is known
  if (sourceVersion < 1 || sourceVersion > CURRENT_VERSION) {
    throw new Error(`[app-snapshot] Unknown snapshot version: ${sourceVersion}`);
  }

  // Validate against the source version's schema
  const sourceSchema = getSchema(sourceVersion);
  if (!sourceSchema) {
    throw new Error(`[app-snapshot] No schema found for version ${sourceVersion}`);
  }

  const parseResult = sourceSchema.safeParse(snapshot);
  if (!parseResult.success) {
    console.error('[app-snapshot] Snapshot validation failed:', parseResult.error.errors);
    throw new Error(`[app-snapshot] Invalid v${sourceVersion} snapshot: ${parseResult.error.message}`);
  }
  snapshot = parseResult.data;

  // Run migrations sequentially until we reach the current version
  while (snapshot.version < CURRENT_VERSION) {
    const migrate = getMigration(snapshot.version);
    if (!migrate) {
      throw new Error(`[app-snapshot] No migration from v${snapshot.version} to v${snapshot.version + 1}`);
    }

    const prevVersion = snapshot.version;
    snapshot = migrate(snapshot);

    // Validate the migrated snapshot against its new version's schema
    const newSchema = getSchema(snapshot.version);
    if (newSchema) {
      const migrationResult = newSchema.safeParse(snapshot);
      if (!migrationResult.success) {
        console.error(`[app-snapshot] Migration v${prevVersion} -> v${snapshot.version} produced invalid snapshot:`, migrationResult.error.errors);
        throw new Error(`[app-snapshot] Migration to v${snapshot.version} failed validation`);
      }
      snapshot = migrationResult.data;
    }
  }

  return snapshot;
};
