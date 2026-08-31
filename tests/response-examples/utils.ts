import * as fs from 'fs';
import * as path from 'path';
import { findCollectionDir } from '../utils/collection-files';

export const requestFilePath = (testDir: string, requestName: string, format: 'bru' | 'yml'): string =>
  path.join(findCollectionDir(testDir), `${requestName}.${format}`);

/**
 * Example names in the order they appear in the request file on disk.
 *
 * Both formats persist examples as an ordered sequence — `bru` writes consecutive
 * `example { }` blocks, `yml` writes an `examples:` list — so first-appearance order in the
 * raw text is the saved order. Comparing raw positions rather than parsing keeps this helper
 * honest about what actually landed on disk and works unchanged for both formats.
 *
 * Requires example names that are not substrings of each other or of the request name.
 */
export const exampleOrderOnDisk = (filePath: string, names: string[]): string[] => {
  const content = fs.readFileSync(filePath, 'utf8');

  return names
    .map((name) => {
      const index = content.indexOf(name);
      if (index === -1) throw new Error(`Example "${name}" is missing from ${filePath}`);
      return { name, index };
    })
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.name);
};
