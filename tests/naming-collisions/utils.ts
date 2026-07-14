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

/**
 * Find the collection root under `testDir`. Bruno marks a collection root with
 * `bruno.json` (bru format) or `opencollection.yml` (yml format).
 */
export const findCollectionDir = (testDir: string): string => {
  const markers = ['bruno.json', 'opencollection.yml'];
  for (const entry of fs.readdirSync(testDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const candidate = path.join(testDir, entry.name);
      if (markers.some((m) => fs.existsSync(path.join(candidate, m)))) return candidate;
    }
  }
  throw new Error(`No collection (bruno.json / opencollection.yml) found under ${testDir}`);
};

/** Minimal valid .bru request content, for seeding files directly on disk. */
export const minimalBru = (name: string) => `meta {\n  name: ${name}\n  type: http\n  seq: 1\n}\n`;

/**
 * Probe whether the filesystem backing `dir` is case-insensitive, by creating a
 * marker file and checking whether a case-flipped name resolves to the same file.
 *
 * We must NOT infer this from `process.platform` — the OS doesn't determine
 * volume semantics (macOS can be mounted case-sensitive; a Linux mount can be
 * case-insensitive). Tests whose expected on-disk result differs by case
 * behavior branch on this observed value instead.
 */
export const isCaseInsensitiveFs = (dir: string): boolean => {
  const marker = path.join(dir, `.bruno-case-probe-${process.pid}-${Date.now()}a`);
  const flipped = path.join(dir, path.basename(marker).replace(/a$/, 'A'));
  try {
    fs.writeFileSync(marker, '');
    return fs.existsSync(flipped);
  } catch {
    return false;
  } finally {
    try {
      fs.rmSync(marker, { force: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
};
