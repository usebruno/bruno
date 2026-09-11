import * as fs from 'fs';
import * as path from 'path';

/**
 * Locate the collection directory Bruno created inside a throwaway test dir.
 *
 * `createTmpDir` hands back the parent, and the collection lands in a subdirectory named
 * after itself, so specs that assert on files have to find it by its marker file. The marker
 * differs per format: `bru` collections carry `bruno.json`, `yml` collections
 * `opencollection.yml`.
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
