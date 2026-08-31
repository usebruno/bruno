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

/**
 * Content plus modification time for a request file.
 *
 * Content alone cannot prove a file was left alone: a reorder that resolves to the order already
 * on disk would be rewritten with byte-identical content, so only the mtime distinguishes "never
 * written" from "written again with the same bytes". Autosave is disabled in tests, so nothing
 * else touches these files mid-test.
 */
export const fileSnapshot = (filePath: string): { content: string; mtimeMs: number } => ({
  content: fs.readFileSync(filePath, 'utf8'),
  mtimeMs: fs.statSync(filePath).mtimeMs
});

/**
 * Poll-safe `exampleOrderOnDisk`: yields null instead of throwing while a name is still absent or
 * the file is mid-write, so it can drive `expect.poll` without aborting it.
 */
export const exampleOrderOnDiskOrNull = (filePath: string, names: string[]): string[] | null => {
  try {
    return exampleOrderOnDisk(filePath, names);
  } catch {
    return null;
  }
};
