import { version } from './index';

describe('@usebruno/sqlite', () => {
  it('exposes a version', () => {
    expect(version).toBe('0.1.0');
  });
});
