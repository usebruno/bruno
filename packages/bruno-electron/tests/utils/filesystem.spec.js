const { getUniqueSiblingName } = require('../../src/utils/filesystem');

describe('getUniqueSiblingName', () => {
  test('returns the name unchanged when no collision', () => {
    const used = new Set();
    expect(getUniqueSiblingName('Users', '', used)).toBe('Users');
    expect(used.has('users')).toBe(true);
  });

  test('suffixes " - 2" on a same-case collision', () => {
    const used = new Set();
    getUniqueSiblingName('Users', '', used);
    expect(getUniqueSiblingName('Users', '', used)).toBe('Users - 2');
  });

  test('suffixes " - 2" on a case-only collision', () => {
    const used = new Set();
    getUniqueSiblingName('OAuth2', '', used);
    expect(getUniqueSiblingName('oAuth2', '', used)).toBe('oAuth2 - 2');
    expect(getUniqueSiblingName('OAUTH2', '', used)).toBe('OAUTH2 - 3');
  });

  test('keeps counting past pre-reserved suffixes', () => {
    const used = new Set();
    getUniqueSiblingName('Users', '', used);
    getUniqueSiblingName('Users', '', used); // -> Users - 2
    expect(getUniqueSiblingName('Users', '', used)).toBe('Users - 3');
  });

  test('inserts suffix before the extension for files', () => {
    const used = new Set();
    getUniqueSiblingName('GetUser', '.bru', used);
    expect(getUniqueSiblingName('getuser', '.bru', used)).toBe('getuser - 2.bru');
  });

  test('folders and files share the namespace', () => {
    const used = new Set();
    getUniqueSiblingName('auth', '', used);
    // An exact-name file would collide on disk, so the dedup should catch it.
    expect(used.has('auth')).toBe(true);
    // A file with extension has a distinct name, so no collision.
    expect(getUniqueSiblingName('auth', '.bru', used)).toBe('auth.bru');
  });

  test('empty extension arg is treated as none', () => {
    const used = new Set();
    expect(getUniqueSiblingName('folder', undefined, used)).toBe('folder');
    expect(getUniqueSiblingName('folder', null, used)).toBe('folder - 2');
  });
});
