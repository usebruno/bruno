import * as fs from 'fs';
import * as path from 'path';

/** Collection/folder settings files that are not user-created request files. */
export const SETTINGS_FILES = new Set([
  'collection.bru',
  'folder.bru',
  'collection.yml',
  'folder.yml',
  'opencollection.yml'
]);

/**
 * Recursively collect request-file basenames under `dir`, excluding
 * collection/folder settings files. This is how we assert the *actual on-disk
 * filename* — the UI label alone can't prove that Bruno silently suffixed a
 * filesystem collision.
 */
export const listRequestFiles = (dir: string, ext = '.bru'): string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listRequestFiles(full, ext));
    } else if (entry.name.endsWith(ext) && !SETTINGS_FILES.has(entry.name)) {
      out.push(entry.name);
    }
  }
  return out;
};

/** Find the collection root (the dir containing bruno.json) under `testDir`. */
export const findCollectionDir = (testDir: string): string => {
  for (const entry of fs.readdirSync(testDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const candidate = path.join(testDir, entry.name);
      if (fs.existsSync(path.join(candidate, 'bruno.json'))) return candidate;
    }
  }
  throw new Error(`No collection (bruno.json) found under ${testDir}`);
};

/** Minimal valid .bru request content, for seeding files directly on disk. */
export const minimalBru = (name: string) => `meta {\n  name: ${name}\n  type: http\n  seq: 1\n}\n`;
