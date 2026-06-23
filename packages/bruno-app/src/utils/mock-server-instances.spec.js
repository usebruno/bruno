import {
  DEFAULT_MOCK_SERVER_PORT,
  suggestNextMockServerPort
} from './mock-server-instances';

describe('suggestNextMockServerPort', () => {
  it('returns the default port when no instances exist', () => {
    expect(suggestNextMockServerPort([])).toBe(DEFAULT_MOCK_SERVER_PORT);
  });

  it('returns the next port when the default is already assigned', () => {
    const instances = [{ uid: 'a', port: DEFAULT_MOCK_SERVER_PORT }];
    expect(suggestNextMockServerPort(instances)).toBe(DEFAULT_MOCK_SERVER_PORT + 1);
  });

  it('skips multiple assigned ports', () => {
    const instances = [
      { uid: 'a', port: 4000 },
      { uid: 'b', port: 4001 }
    ];
    expect(suggestNextMockServerPort(instances)).toBe(4002);
  });

  it('ignores the excluded instance when editing', () => {
    const instances = [{ uid: 'a', port: 4000 }];
    expect(suggestNextMockServerPort(instances, { excludeUid: 'a' })).toBe(4000);
  });
});
