// These tests resolve against the real host cwd,
// so results are asserted in the host's native path format.
import path from 'path';
import { getRelativePathWithinBasePath } from './path';

describe('Path Utilities - cwd-relative resolution (host platform)', () => {
  it('should treat relative collection path as cwd-relative when file path is absolute', () => {
    const collectionPath = 'collections/api';
    const filePath = path.resolve(collectionPath, 'files/payload.txt');
    const result = getRelativePathWithinBasePath(collectionPath, filePath);
    expect(result).toBe(path.join('files', 'payload.txt'));
  });

  it('should treat relative file path as cwd-relative when collection path is absolute', () => {
    const collectionPath = path.resolve('collections/api');
    const filePath = 'collections/api/files/payload.txt';
    const result = getRelativePathWithinBasePath(collectionPath, filePath);
    expect(result).toBe(path.join('files', 'payload.txt'));
  });
});
