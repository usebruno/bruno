const jestClearModules = () => {
  jest.resetModules();
  jest.clearAllMocks();
};

/** Mock every external dependency that proxy-util pulls in so tests are isolated. */
const setupMocks = ({ pacDirectives = ['PROXY p.example:8080'] } = {}) => {
  // Preferences — controls SSL session cache flag
  jest.doMock('../src/store/preferences', () => ({
    preferencesUtil: {
      isSslSessionCachingEnabled: () => false
    }
  }));

  // @usebruno/requests — agent factories + pac resolver
  jest.doMock('@usebruno/requests', () => ({
    getOrCreateHttpsAgent: jest.fn(() => ({ type: 'https-agent' })),
    getOrCreateHttpAgent: jest.fn(() => ({ type: 'http-agent' })),
    getPacResolver: jest.fn(async () => ({
      resolve: async () => pacDirectives,
      dispose: () => {}
    })),
    clearPacCache: jest.fn()
  }));
};

describe('proxy-util', () => {
  beforeEach(() => jestClearModules());
  afterEach(() => jestClearModules());

  test('shouldUseProxy respects wildcard bypass', () => {
    const { shouldUseProxy } = require('../src/utils/proxy-util');
    expect(shouldUseProxy('http://example.com', '*')).toBe(false);
  });

  test('setupProxyAgents: PAC PROXY directive sets http and https agents', async () => {
    setupMocks({ pacDirectives: ['PROXY p.example:8080', 'DIRECT'] });
    const { setupProxyAgents } = require('../src/utils/proxy-util');
    const { getOrCreateHttpAgent, getOrCreateHttpsAgent } = require('@usebruno/requests');

    const requestConfig = { url: 'http://example.com/resource' };
    const timeline = [];

    await setupProxyAgents({
      requestConfig,
      proxyMode: 'pac',
      proxyConfig: { pac: { source: 'http://pac-server/proxy.pac' } },
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      timeline
    });

    expect(requestConfig.httpsAgent).toBeDefined();
    expect(requestConfig.httpAgent).toBeDefined();
    expect(getOrCreateHttpsAgent).toHaveBeenCalledWith(expect.objectContaining({ proxyUri: 'http://p.example:8080' }));
    expect(getOrCreateHttpAgent).toHaveBeenCalledWith(expect.objectContaining({ proxyUri: 'http://p.example:8080' }));

    const hasPacInfo = timeline.some((t) => t.type === 'info' && /PAC directives/.test(t.message));
    expect(hasPacInfo).toBe(true);
  });

  test('setupProxyAgents: PAC DIRECT directive bypasses proxy and uses fallback agent', async () => {
    setupMocks({ pacDirectives: ['DIRECT'] });
    const { setupProxyAgents } = require('../src/utils/proxy-util');
    const { getOrCreateHttpAgent, getOrCreateHttpsAgent } = require('@usebruno/requests');

    const requestConfig = { url: 'http://example.com/resource' };
    const timeline = [];

    await setupProxyAgents({
      requestConfig,
      proxyMode: 'pac',
      proxyConfig: { pac: { source: 'http://pac-server/proxy.pac' } },
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      timeline
    });

    // DIRECT → no proxy agents set inside PAC block, fallback sets httpAgent for http request
    expect(requestConfig.httpAgent).toBeDefined();
    // httpsAgent should NOT have been set (http request, not https)
    expect(requestConfig.httpsAgent).toBeUndefined();
    // Fallback agent called with null proxyUri
    expect(getOrCreateHttpAgent).toHaveBeenCalledWith(expect.objectContaining({ proxyUri: null }));
    expect(getOrCreateHttpsAgent).not.toHaveBeenCalled();
  });

  test('setupProxyAgents: PAC SOCKS directive sets socks agents', async () => {
    setupMocks({ pacDirectives: ['SOCKS5 socks.example:1080'] });
    const { setupProxyAgents } = require('../src/utils/proxy-util');
    const { getOrCreateHttpAgent, getOrCreateHttpsAgent } = require('@usebruno/requests');

    const requestConfig = { url: 'http://example.com/resource' };
    const timeline = [];

    await setupProxyAgents({
      requestConfig,
      proxyMode: 'pac',
      proxyConfig: { pac: { source: 'http://pac-server/proxy.pac' } },
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      timeline
    });

    expect(requestConfig.httpsAgent).toBeDefined();
    expect(requestConfig.httpAgent).toBeDefined();
    expect(getOrCreateHttpsAgent).toHaveBeenCalledWith(
      expect.objectContaining({ proxyUri: 'socks5://socks.example:1080' })
    );
    expect(getOrCreateHttpAgent).toHaveBeenCalledWith(
      expect.objectContaining({ proxyUri: 'socks5://socks.example:1080' })
    );
  });

  test('setupProxyAgents: manual socks5h proxy routes through socks agent and preserves the socks5h scheme', async () => {
    setupMocks();
    const { setupProxyAgents } = require('../src/utils/proxy-util');
    const { SocksProxyAgent } = require('socks-proxy-agent');
    const { getOrCreateHttpsAgent } = require('@usebruno/requests');

    // https request → only the https agent should be set
    const requestConfig = { url: 'https://example.com/resource' };
    const timeline = [];

    await setupProxyAgents({
      requestConfig,
      proxyMode: 'on',
      proxyConfig: {
        protocol: 'socks5h',
        hostname: 'socks.example',
        port: 1080,
        auth: { disabled: true }
      },
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      timeline
    });

    // The socks5h scheme must reach socks-proxy-agent verbatim — that scheme is what
    // tells the agent to resolve the target hostname on the proxy side (remote DNS).
    expect(getOrCreateHttpsAgent).toHaveBeenCalledWith(
      expect.objectContaining({ AgentClass: SocksProxyAgent, proxyUri: 'socks5h://socks.example:1080' })
    );
  });

  test('setupProxyAgents: PAC resolution error logs to timeline and falls back to direct agent', async () => {
    jest.doMock('../src/store/preferences', () => ({
      preferencesUtil: { isSslSessionCachingEnabled: () => false }
    }));
    jest.doMock('@usebruno/requests', () => ({
      getOrCreateHttpsAgent: jest.fn(() => ({ type: 'https-agent' })),
      getOrCreateHttpAgent: jest.fn(() => ({ type: 'http-agent' })),
      getPacResolver: jest.fn(async () => { throw new Error('PAC fetch timeout'); }),
      clearPacCache: jest.fn()
    }));

    const { setupProxyAgents } = require('../src/utils/proxy-util');
    const { getOrCreateHttpAgent } = require('@usebruno/requests');

    const requestConfig = { url: 'http://example.com/resource' };
    const timeline = [];

    await setupProxyAgents({
      requestConfig,
      proxyMode: 'pac',
      proxyConfig: { pac: { source: 'http://unreachable/proxy.pac' } },
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      timeline
    });

    // Error should be logged to timeline
    const hasError = timeline.some((t) => t.type === 'error' && /PAC resolution failed/.test(t.message));
    expect(hasError).toBe(true);
    // Fallback direct agent should be set for the http request
    expect(requestConfig.httpAgent).toBeDefined();
    expect(getOrCreateHttpAgent).toHaveBeenCalledWith(expect.objectContaining({ proxyUri: null }));
  });
});
