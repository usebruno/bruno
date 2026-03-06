import * as v1 from './v1';

// Schema versions in order (add new versions here)
const versions = [v1];

export const CURRENT_VERSION = versions.length;

const getSchema = (version) => versions[version - 1]?.schema || null;
const getMigration = (version) => versions[version - 1]?.migrate || null;

// Validate snapshot against current schema
export const validateSnapshot = (snapshot) => {
  return getSchema(CURRENT_VERSION).parse(snapshot);
};

// Validate without throwing
export const safeValidateSnapshot = (snapshot) => {
  return getSchema(CURRENT_VERSION).safeParse(snapshot);
};

// Load snapshot and migrate to current version if needed
export const loadAndMigrateSnapshot = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('[app-snapshot] Invalid snapshot data');
  }

  let snapshot = { ...data };
  if (snapshot.version === undefined) {
    snapshot.version = 1;
  }

  if (snapshot.version < 1 || snapshot.version > CURRENT_VERSION) {
    throw new Error(`[app-snapshot] Unknown snapshot version: ${snapshot.version}`);
  }

  // Validate against source version
  const sourceSchema = getSchema(snapshot.version);
  const parseResult = sourceSchema.safeParse(snapshot);
  if (!parseResult.success) {
    console.error('[app-snapshot] Snapshot validation failed:', parseResult.error.errors);
    throw new Error(`[app-snapshot] Invalid v${snapshot.version} snapshot`);
  }
  snapshot = parseResult.data;

  // Run migrations until current version
  while (snapshot.version < CURRENT_VERSION) {
    const migrate = getMigration(snapshot.version);
    if (!migrate) {
      throw new Error(`[app-snapshot] No migration from v${snapshot.version}`);
    }

    snapshot = migrate(snapshot);

    // Validate migrated snapshot
    const newSchema = getSchema(snapshot.version);
    if (newSchema) {
      const result = newSchema.safeParse(snapshot);
      if (!result.success) {
        throw new Error(`[app-snapshot] Migration to v${snapshot.version} failed validation`);
      }
      snapshot = result.data;
    }
  }

  return snapshot;
};
