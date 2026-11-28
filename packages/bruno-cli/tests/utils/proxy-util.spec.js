const http = require('node:http');
const https = require('node:https');
const { HttpProxyAgent } = require('http-proxy-agent');
const { PatchedHttpsProxyAgent } = require('@usebruno/requests');

const { setupProxyAgents } = require('../../src/utils/proxy-util');

describe.each(['on', 'system'])('%s proxy bypass', (proxyMode) => {
  it.each([
    ['http://127.0.0.1:8080', false],
    ['https://192.168.1.20', false],
    ['http://10.1.2.3', false],
    ['https://api.dev.example.com', false],
    ['http://192.169.1.20', true],
    ['https://external.example.com', true]
  ])('routes %s with proxy=%s', async (url, useProxy) => {
    const bypass = '127.*;192.168.*;10.*;api.*.example.com';
    const systemProxyConfig = {
      http_proxy: 'http://proxy.example.com:3128',
      https_proxy: 'http://proxy.example.com:3128',
      no_proxy: bypass
    };
    const manualProxyConfig = {
      protocol: 'http',
      hostname: 'proxy.example.com',
      port: 3128,
      auth: { disabled: true },
      bypassProxy: bypass
    };
    const requestConfig = { url };
    await setupProxyAgents({
      requestConfig,
      proxyMode,
      proxyConfig: manualProxyConfig,
      systemProxyConfig,
      httpsAgentRequestFields: {},
      interpolationOptions: {}
    });

    try {
      if (url.startsWith('https:')) {
        expect(requestConfig.httpsAgent.constructor).toBe(useProxy ? PatchedHttpsProxyAgent : https.Agent);
      } else {
        expect(requestConfig.httpAgent.constructor).toBe(useProxy ? HttpProxyAgent : http.Agent);
      }
    } finally {
      requestConfig.httpAgent?.destroy();
      requestConfig.httpsAgent?.destroy();
    }
  });
});
