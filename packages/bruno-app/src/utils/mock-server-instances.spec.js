import {
  DEFAULT_MOCK_SERVER_PORT,
  isMockServerRelatedTab,
  isMockServerNameTaken,
  isMockServerPortTaken,
  normalizeMockTabType,
  suggestNextMockServerPort
} from './mock-server-instances';

describe('mock server tab helpers', () => {
  it('normalizes legacy mock-server-dashboard tab type to mocker', () => {
    expect(normalizeMockTabType('mock-server-dashboard')).toBe('mocker');
    expect(normalizeMockTabType('mocker')).toBe('mocker');
    expect(normalizeMockTabType('mock-response')).toBe('mock-response');
  });

  it('matches mocker and mock-response tabs for the same mock server', () => {
    expect(isMockServerRelatedTab({ type: 'mocker', mockServerUid: 'mock-1' }, 'mock-1')).toBe(true);
    expect(isMockServerRelatedTab({ type: 'mock-server-dashboard', mockServerUid: 'mock-1' }, 'mock-1')).toBe(true);
    expect(isMockServerRelatedTab({ type: 'mock-response', mockServerUid: 'mock-1' }, 'mock-1')).toBe(true);
    expect(isMockServerRelatedTab({ type: 'mock-response', mockServerUid: 'mock-2' }, 'mock-1')).toBe(false);
  });
});

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

describe('mock server instance validation helpers', () => {
  const instances = [
    { uid: 'a', name: 'Shop Mock', port: 4000 },
    { uid: 'b', name: 'Auth Mock', port: 4001 }
  ];

  it('detects duplicate mock server names', () => {
    expect(isMockServerNameTaken(instances, 'Shop Mock')).toBe(true);
    expect(isMockServerNameTaken(instances, 'shop mock')).toBe(true);
    expect(isMockServerNameTaken(instances, 'Shop Mock', 'a')).toBe(false);
    expect(isMockServerNameTaken(instances, 'Checkout Mock')).toBe(false);
  });

  it('detects duplicate mock server ports', () => {
    expect(isMockServerPortTaken(instances, 4000)).toBe(true);
    expect(isMockServerPortTaken(instances, 4000, 'a')).toBe(false);
    expect(isMockServerPortTaken(instances, 4010)).toBe(false);
  });
});
