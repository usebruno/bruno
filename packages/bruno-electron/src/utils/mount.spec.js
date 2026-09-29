const { isDenied, resolveDenylist } = require('./mount');

describe('mount denylist', () => {
  test('plain folder paths deny the folder and its descendants without matching prefixes', () => {
    const denylist = resolveDenylist(['parent/child']);

    expect(isDenied('parent/child', denylist)).toBe(true);
    expect(isDenied('parent/child/request.bru', denylist)).toBe(true);
    expect(isDenied('parent/children/request.bru', denylist)).toBe(false);
  });

  test('preserves glob matching for default denylist entries', () => {
    expect(isDenied('nested/.DS_Store', resolveDenylist())).toBe(true);
  });

  test('folder entries with a trailing separator deny the folder and its descendants', () => {
    const denylist = resolveDenylist(['hidden/']);

    expect(isDenied('hidden', denylist)).toBe(true);
    expect(isDenied('hidden/request.bru', denylist)).toBe(true);
    expect(isDenied('hidden-other/request.bru', denylist)).toBe(false);
  });

  test('a glob denies the path it matches and not files beneath that directory', () => {
    const denylist = resolveDenylist(['**/hidden']);

    expect(isDenied('nested/hidden', denylist)).toBe(true);
    expect(isDenied('nested/hidden/request.bru', denylist)).toBe(false);
    expect(isDenied('nested/visible/request.bru', denylist)).toBe(false);
  });

  test('a trailing slash on a glob does not match every path', () => {
    expect(isDenied('foo/bar.bru', resolveDenylist(['**/']))).toBe(false);
    expect(isDenied('visible.bru', resolveDenylist(['*/']))).toBe(false);
    expect(isDenied('dir/file.bru', resolveDenylist(['*/']))).toBe(false);
  });
});
