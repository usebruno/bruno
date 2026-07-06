import { version } from './node';

describe('@usebruno/sqlite', () => {
  it('exposes a version', () => {
    expect(version).toBe('0.1.0');
  });
});
