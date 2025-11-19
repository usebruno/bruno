const jestClearModules = () => {
  jest.resetModules();
  jest.clearAllMocks();
};

describe('proxy-util minimal tests', () => {
  beforeEach(() => jestClearModules());
  afterEach(() => jestClearModules());

  test('shouldUseProxy respects wildcard bypass', () => {
    const { shouldUseProxy } = require('../src/utils/proxy-util');
    const url = 'http://example.com';
    expect(shouldUseProxy(url, '*')).toBe(false);
  });

  test('setupProxyAgents handles PAC directive PROXY and sets agents', async () => {
    const path = require('path');
    const pacResolverPath = path.resolve(__dirname, '..', '..', 'bruno-common', 'src', 'net', 'pac-resolver');
    jest.doMock(pacResolverPath, () => ({
      getPacResolver: async () => ({
        resolve: async () => ['PROXY p.example:8080', 'DIRECT'],
        dispose: () => {}
      }),
      clearCache: () => {}
    }));

    const { setupProxyAgents } = require('../src/utils/proxy-util');

    const requestConfig = { url: 'http://example.com/resource' };
    const timeline = [];

    await setupProxyAgents({
      requestConfig,
      proxyMode: 'pac',
      proxyConfig: { pacUrl: 'http://pac' },
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      timeline
    });

    // Ensure httpsAgent was set by PAC handling
    expect(requestConfig.httpsAgent).toBeDefined();
    // timeline should contain info about PAC directives
    const hasPacInfo = timeline.some((t) => t.type === 'info' && /PAC directives/.test(t.message));
    expect(hasPacInfo).toBe(true);
  });
});
