const { describe, it, expect } = require('@jest/globals');
const path = require('node:path');
const { isRelativePathOutsideRoot } = require('./path');

describe('isRelativePathOutsideRoot', () => {
  const root = path.resolve('/collection');
  const relativeTo = (...segments) => path.relative(root, path.resolve(root, ...segments));

  it('returns false for a file inside the root', () => {
    expect(isRelativePathOutsideRoot(relativeTo('helper.js'))).toBe(false);
  });

  it('returns false for the root itself', () => {
    expect(isRelativePathOutsideRoot(relativeTo('.'))).toBe(false);
  });

  it('returns false for file and directory names that begin with ..', () => {
    expect(isRelativePathOutsideRoot(relativeTo('..private.js'))).toBe(false);
    expect(isRelativePathOutsideRoot(relativeTo('..hidden', 'helper.js'))).toBe(false);
  });

  it('returns true for the parent directory', () => {
    expect(isRelativePathOutsideRoot(relativeTo('..'))).toBe(true);
  });

  it('returns true for a path that traverses out of the root', () => {
    expect(isRelativePathOutsideRoot(relativeTo('..', 'outside.js'))).toBe(true);
    expect(isRelativePathOutsideRoot(relativeTo('..', 'collection-sibling', 'helper.js'))).toBe(true);
  });

  it('returns true for an absolute path', () => {
    expect(isRelativePathOutsideRoot(path.resolve('/elsewhere/file.js'))).toBe(true);
  });
});
