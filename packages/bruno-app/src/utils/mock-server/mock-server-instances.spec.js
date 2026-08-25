import {
  DEFAULT_MOCK_SERVER_PORT,
  getMockServerNameError,
  getMockServerPortError,
  getMockServerPortRangeError,
  isMockServerRelatedTab,
  isMockServerNameTaken,
  isMockServerPortTaken,
  normalizeMockTabType,
  suggestNextMockServerPort
} from './mock-server-instances';

describe('mock server tab helpers', () => {
  it('normalizes legacy mock-server-dashboard and mocker tab types to mock-server', () => {
    expect(normalizeMockTabType('mock-server-dashboard')).toBe('mock-server');
    expect(normalizeMockTabType('mocker')).toBe('mock-server');
    expect(normalizeMockTabType('mock-server')).toBe('mock-server');
    expect(normalizeMockTabType('mock-response')).toBe('mock-response');
  });

  it('matches mock-server and mock-response tabs for the same mock server', () => {
    expect(isMockServerRelatedTab({ type: 'mock-server', mockServerUid: 'mock-1' }, 'mock-1')).toBe(true);
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

describe('getMockServerPortRangeError', () => {
  it('rejects empty port values', () => {
    expect(getMockServerPortRangeError('')).toBe('Port is required');
    expect(getMockServerPortRangeError(null)).toBe('Port is required');
  });

  it('rejects non-integer ports', () => {
    expect(getMockServerPortRangeError(4000.5)).toBe('Port must be a whole number');
  });

  it('rejects ports below 1', () => {
    expect(getMockServerPortRangeError(0)).toBe('Port must be at least 1');
  });

  it('rejects ports above 65535', () => {
    expect(getMockServerPortRangeError(65536)).toBe('Port must be 65535 or less');
  });

  it('accepts ports in range', () => {
    expect(getMockServerPortRangeError(1)).toBeNull();
    expect(getMockServerPortRangeError(65535)).toBeNull();
    expect(getMockServerPortRangeError(4000)).toBeNull();
    expect(getMockServerPortRangeError(' 8080 ')).toBeNull();
  });

  it('treats whitespace-only values as missing rather than out of range', () => {
    expect(getMockServerPortRangeError('   ')).toBe('Port is required');
  });

  it('rejects negative ports', () => {
    expect(getMockServerPortRangeError(-1)).toBe('Port must be at least 1');
  });
});

describe('getMockServerPortError', () => {
  it('returns null when the port is available', () => {
    expect(getMockServerPortError({ available: true }, 4000)).toBeNull();
  });

  it('reports ports held by another process', () => {
    expect(getMockServerPortError({ available: false, reason: 'system' }, 4000))
      .toBe('Port 4000 is already in use on this system.');
  });

  it('reports ports held by another mock server', () => {
    expect(getMockServerPortError({ available: false, reason: 'bruno' }, 4000))
      .toBe('Port 4000 is already used by another mock server in Bruno.');
  });
});

describe('mock server name validation', () => {
  it('follows collection-name rules: any characters are allowed', () => {
    expect(getMockServerNameError('Shop Mock')).toBe('');
    expect(getMockServerNameError('mock-1')).toBe('');
    expect(getMockServerNameError('12345')).toBe('');
    expect(getMockServerNameError('!@££@!£@!')).toBe('');
    expect(getMockServerNameError('Dog / Cat: API? *v2*')).toBe('');
  });

  it('rejects empty and over-long names', () => {
    expect(getMockServerNameError('')).toBe('Name is required');
    expect(getMockServerNameError('   ')).toBe('Name is required');
    expect(getMockServerNameError(null)).toBe('Name is required');
    expect(getMockServerNameError('a'.repeat(256))).toBe('Must be 255 characters or less');
    expect(getMockServerNameError('a'.repeat(255))).toBe('');
  });
});
