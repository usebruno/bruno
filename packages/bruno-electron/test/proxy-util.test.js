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

  // @usebruno/requests — agent factories + pac resolver + shared resolveAgentsFromPac
  jest.doMock('@usebruno/requests', () => {
    const getOrCreateHttpsAgent = jest.fn(() => ({ type: 'https-agent' }));
    const getOrCreateHttpAgent = jest.fn(() => ({ type: 'http-agent' }));
    const getPacResolver = jest.fn(async () => ({
      resolve: async () => pacDirectives,
      dispose: () => {}
    }));
    // Inline mock of resolveAgentsFromPac that wires through the mocked factories
    // so existing assertions on getOrCreateHttp(s)Agent call args still hold.
    const resolveAgentsFromPac = jest.fn(async ({ pacSource, requestUrl, tlsOptions, httpsAgentRequestFields, timeline, disableCache, hostname }) => {
      const resolver = await getPacResolver({ pacSource, httpsAgentRequestFields });
      const directives = await resolver.resolve(requestUrl);
      if (!directives || !directives.length) return { directives: null };
      const first = directives[0];
      if (/^(PROXY|HTTPS?)\s+/i.test(first)) {
        const parts = first.split(/\s+/);
        const scheme = parts[0].toUpperCase() === 'HTTPS' ? 'https' : 'http';
        const proxyUri = `${scheme}://${parts[1]}`;
        return {
          directives,
          httpAgent: getOrCreateHttpAgent({ proxyUri, options: { keepAlive: true }, timeline, disableCache, hostname }),
          httpsAgent: getOrCreateHttpsAgent({ proxyUri, options: tlsOptions, timeline, disableCache, hostname })
        };
      }
      if (/^SOCKS/i.test(first)) {
        const proto = /^SOCKS4\s/i.test(first) ? 'socks4' : 'socks5';
        const proxyUri = `${proto}://${first.split(/\s+/)[1]}`;
        return {
          directives,
          httpAgent: getOrCreateHttpAgent({ proxyUri, options: { keepAlive: true }, timeline, disableCache, hostname }),
          httpsAgent: getOrCreateHttpsAgent({ proxyUri, options: tlsOptions, timeline, disableCache, hostname })
        };
      }
      return { directives };
    });
    return {
      getOrCreateHttpsAgent,
      getOrCreateHttpAgent,
      getPacResolver,
      resolveAgentsFromPac,
      PatchedHttpsProxyAgent: class {},
      clearPacCache: jest.fn()
    };
  });
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

  test('setupProxyAgents: PAC resolution error logs to timeline and falls back to direct agent', async () => {
    jest.doMock('../src/store/preferences', () => ({
      preferencesUtil: { isSslSessionCachingEnabled: () => false }
    }));
    jest.doMock('@usebruno/requests', () => ({
      getOrCreateHttpsAgent: jest.fn(() => ({ type: 'https-agent' })),
      getOrCreateHttpAgent: jest.fn(() => ({ type: 'http-agent' })),
      getPacResolver: jest.fn(async () => { throw new Error('PAC fetch timeout'); }),
      resolveAgentsFromPac: jest.fn(async () => { throw new Error('PAC fetch timeout'); }),
      PatchedHttpsProxyAgent: class {},
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

  test('setupProxyAgents: manual proxy routes both HTTP and HTTPS by default', async () => {
    setupMocks();
    const { setupProxyAgents } = require('../src/utils/proxy-util');
    const { getOrCreateHttpAgent, getOrCreateHttpsAgent } = require('@usebruno/requests');

    const proxyConfig = {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: 8080,
      auth: { disabled: true, username: '', password: '' },
      bypassProxy: ''
    };

    const httpReq = { url: 'http://example.com/resource' };
    await setupProxyAgents({
      requestConfig: httpReq,
      proxyMode: 'on',
      proxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {}
    });
    expect(httpReq.httpAgent).toBeDefined();
    expect(getOrCreateHttpAgent).toHaveBeenCalledWith(expect.objectContaining({ proxyUri: 'http://127.0.0.1:8080' }));

    const httpsReq = { url: 'https://example.com/resource' };
    await setupProxyAgents({
      requestConfig: httpsReq,
      proxyMode: 'on',
      proxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {}
    });
    expect(httpsReq.httpsAgent).toBeDefined();
    expect(getOrCreateHttpsAgent).toHaveBeenCalledWith(expect.objectContaining({ proxyUri: 'http://127.0.0.1:8080' }));
  });

  test('setupProxyAgents: manual proxy with targetProtocols { http: false, https: true } proxies only HTTPS', async () => {
    setupMocks();
    const { setupProxyAgents } = require('../src/utils/proxy-util');
    const { getOrCreateHttpAgent, getOrCreateHttpsAgent } = require('@usebruno/requests');

    const proxyConfig = {
      protocol: 'http',
      targetProtocols: { http: false, https: true },
      hostname: '127.0.0.1',
      port: 8080,
      auth: { disabled: true, username: '', password: '' },
      bypassProxy: ''
    };

    const httpTimeline = [];
    const httpReq = { url: 'http://example.com/resource' };
    await setupProxyAgents({
      requestConfig: httpReq,
      proxyMode: 'on',
      proxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      timeline: httpTimeline
    });
    expect(getOrCreateHttpAgent).toHaveBeenCalledWith(expect.objectContaining({ proxyUri: null }));
    expect(httpTimeline.some((t) => t.type === 'info' && /Proxy skipped: HTTP traffic/.test(t.message))).toBe(true);

    const httpsReq = { url: 'https://example.com/resource' };
    await setupProxyAgents({
      requestConfig: httpsReq,
      proxyMode: 'on',
      proxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {}
    });
    expect(getOrCreateHttpsAgent).toHaveBeenCalledWith(expect.objectContaining({ proxyUri: 'http://127.0.0.1:8080' }));
  });

  test('setupProxyAgents: manual proxy with targetProtocols { http: true, https: false } proxies only HTTP and resets on redirect', async () => {
    setupMocks();
    const { setupProxyAgents } = require('../src/utils/proxy-util');
    const { getOrCreateHttpAgent, getOrCreateHttpsAgent } = require('@usebruno/requests');

    const proxyConfig = {
      protocol: 'socks5',
      targetProtocols: { http: true, https: false },
      hostname: '127.0.0.1',
      port: 1080,
      auth: { disabled: true, username: '', password: '' },
      bypassProxy: ''
    };

    const sharedConfig = { url: 'http://example.com/start' };
    await setupProxyAgents({
      requestConfig: sharedConfig,
      proxyMode: 'on',
      proxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {}
    });
    expect(getOrCreateHttpAgent).toHaveBeenCalledWith(expect.objectContaining({ proxyUri: 'socks5://127.0.0.1:1080' }));

    // Redirect from HTTP -> HTTPS must drop the proxied httpAgent and fall back to a direct httpsAgent
    sharedConfig.url = 'https://example.com/redirected';
    const redirectTimeline = [];
    await setupProxyAgents({
      requestConfig: sharedConfig,
      proxyMode: 'on',
      proxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      timeline: redirectTimeline
    });
    expect(sharedConfig.httpAgent).toBeUndefined();
    expect(sharedConfig.httpsAgent).toBeDefined();
    expect(getOrCreateHttpsAgent).toHaveBeenCalledWith(expect.objectContaining({ proxyUri: null }));
    expect(redirectTimeline.some((t) => t.type === 'info' && /Proxy skipped: HTTPS traffic/.test(t.message))).toBe(true);
  });
});
