const { describe, it, expect } = require('@jest/globals');
const { setupProxyAgents } = require('../../src/utils/proxy-util');

describe('cli proxy-util setupProxyAgents targetProtocols', () => {
  const baseProxyConfig = {
    protocol: 'http',
    hostname: '127.0.0.1',
    port: 8080,
    auth: { disabled: true, username: '', password: '' },
    bypassProxy: ''
  };

  it('proxies both HTTP and HTTPS requests when targetProtocols is omitted', async () => {
    const httpReq = { url: 'http://example.com/api' };
    await setupProxyAgents({
      requestConfig: httpReq,
      proxyMode: 'on',
      proxyConfig: baseProxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      disableCache: true
    });

    const httpsReq = { url: 'https://example.com/api' };
    await setupProxyAgents({
      requestConfig: httpsReq,
      proxyMode: 'on',
      proxyConfig: baseProxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      disableCache: true
    });

    expect(httpReq.httpAgent?.proxy?.href).toBe('http://127.0.0.1:8080/');
    expect(httpsReq.httpsAgent?.proxy?.href).toBe('http://127.0.0.1:8080/');
  });

  it('routes only HTTPS requests when targetProtocols is { http: false, https: true }', async () => {
    const proxyConfig = {
      ...baseProxyConfig,
      targetProtocols: { http: false, https: true }
    };

    const httpReq = { url: 'http://example.com/api' };
    await setupProxyAgents({
      requestConfig: httpReq,
      proxyMode: 'on',
      proxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      disableCache: true
    });

    const httpsReq = { url: 'https://example.com/api' };
    await setupProxyAgents({
      requestConfig: httpsReq,
      proxyMode: 'on',
      proxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      disableCache: true
    });

    expect(httpReq.httpAgent?.proxy).toBeUndefined();
    expect(httpsReq.httpsAgent?.proxy?.href).toBe('http://127.0.0.1:8080/');
  });

  it('routes only HTTP requests when targetProtocols is { http: true, https: false } with SOCKS5', async () => {
    const proxyConfig = {
      ...baseProxyConfig,
      protocol: 'socks5',
      port: 1080,
      targetProtocols: { http: true, https: false }
    };

    const httpReq = { url: 'http://example.com/api' };
    await setupProxyAgents({
      requestConfig: httpReq,
      proxyMode: 'on',
      proxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      disableCache: true
    });

    const httpsReq = { url: 'https://example.com/api' };
    await setupProxyAgents({
      requestConfig: httpsReq,
      proxyMode: 'on',
      proxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {},
      disableCache: true
    });

    expect(httpReq.httpAgent?.proxy?.host).toBe('127.0.0.1');
    expect(httpsReq.httpsAgent?.proxy).toBeUndefined();
  });
});
