import * as fs from 'fs';
import * as path from 'path';
import { findCollectionDir } from '../utils/collection-files';

export const requestFilePath = (testDir: string, requestName: string, format: 'bru' | 'yml'): string =>
  path.join(findCollectionDir(testDir), `${requestName}.${format}`);

/** Thrown by `exampleOrderOnDisk` when a requested name is not present in the file. */
const MISSING_EXAMPLE = 'ERR_EXAMPLE_NOT_IN_FILE';

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
      if (index === -1) {
        throw Object.assign(new Error(`Example "${name}" is missing from ${filePath}`), { code: MISSING_EXAMPLE });
      }
      return { name, index };
    })
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.name);
};

/**
 * Content plus modification time for a request file.
 *
 * Use this to assert a file was **not** rewritten. Content alone cannot show that: a reorder
 * resolving to the order already on disk would be saved with byte-identical content, so only the
 * mtime separates "never written" from "written again the same". Autosave is off in tests, so
 * nothing else touches these files mid-test.
 *
 * Don't invert it to prove a file *was* rewritten — mtime granularity varies by filesystem, so a
 * timestamp is not guaranteed to advance between two nearby writes. Assert the persisted order or
 * content changed instead.
 */
export const fileSnapshot = (filePath: string): { content: string; mtimeMs: number } => ({
  content: fs.readFileSync(filePath, 'utf8'),
  mtimeMs: fs.statSync(filePath).mtimeMs
});

/**
 * Poll-safe `exampleOrderOnDisk` for driving `expect.poll`.
 *
 * A save truncates before it writes, so a read landing mid-write sees content without the names
 * yet — the one genuinely transient outcome, reported as null so the poll retries. Everything
 * else (a wrong path, a permission error) is a bug in the test rather than a race, and is
 * re-thrown so the poll fails immediately instead of timing out on a misleading message.
 */
export const exampleOrderOnDiskOrNull = (filePath: string, names: string[]): string[] | null => {
  try {
    return exampleOrderOnDisk(filePath, names);
  } catch (error) {
    if ((error as { code?: string }).code === MISSING_EXAMPLE) return null;
    throw error;
  }
};
