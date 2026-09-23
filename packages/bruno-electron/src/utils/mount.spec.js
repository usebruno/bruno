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
});
