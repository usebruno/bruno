const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('@usebruno/requests', () => ({
  getOrCreateHttpsAgent: jest.fn(() => ({ type: 'https-agent' })),
  getOrCreateHttpAgent: jest.fn(() => ({ type: 'http-agent' })),
  resolveAgentsFromPac: jest.fn(),
  PatchedHttpsProxyAgent: class {},
  HeaderSafeHttpProxyAgent: class {}
}));

const { getOrCreateHttpAgent, HeaderSafeHttpProxyAgent } = require('@usebruno/requests');
const { setupProxyAgents } = require('../../src/utils/proxy-util');

describe('setupProxyAgents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['on', { proxyConfig: { protocol: 'http', hostname: 'p.example', port: '8080', auth: { disabled: true } } }],
    ['system', { systemProxyConfig: { http_proxy: 'http://p.example:8080' } }]
  ])('%s mode uses HeaderSafeHttpProxyAgent for http requests', async (proxyMode, proxySettings) => {
    const requestConfig = { url: 'http://example.com/resource' };

    await setupProxyAgents({
      requestConfig,
      proxyMode,
      ...proxySettings,
      httpsAgentRequestFields: {},
      interpolationOptions: {}
    });

    expect(requestConfig.httpAgent).toBeDefined();
    expect(getOrCreateHttpAgent).toHaveBeenCalledWith(
      expect.objectContaining({ AgentClass: HeaderSafeHttpProxyAgent, proxyUri: 'http://p.example:8080' })
    );
  });
});
