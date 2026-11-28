const http = require('node:http');
const https = require('node:https');
const { HttpProxyAgent } = require('http-proxy-agent');
const { PatchedHttpsProxyAgent } = require('@usebruno/requests');

jest.mock('../../src/store/preferences', () => ({
  preferencesUtil: { isSslSessionCachingEnabled: () => false }
}));

const { shouldUseProxy, setupProxyAgents } = require('../../src/utils/proxy-util');

test('no proxy necessary - star', () => {
  const url = 'http://wwww.example.org/test';
  const noProxy = '*';

  expect(shouldUseProxy(url, noProxy)).toEqual(false);
});

test('no proxy necessary - no noProxy bypass', () => {
  const url = 'http://wwww.example.org/test';
  const noProxy = '';

  expect(shouldUseProxy(url, noProxy)).toEqual(true);
});

test('no proxy necessary - wildcard match', () => {
  const url = 'http://wwww.example.org/test';
  const noProxy = '*example.org';

  expect(shouldUseProxy(url, noProxy)).toEqual(false);
});

test('no proxy necessary - direct proxy', () => {
  const url = 'http://wwww.example.org/test';
  const noProxy = 'wwww.example.org';

  expect(shouldUseProxy(url, noProxy)).toEqual(false);
});

test('no proxy necessary - multiple proxy', () => {
  const url = 'http://wwww.example.org/test';
  const noProxy = 'www.example.com,wwww.example.org';

  expect(shouldUseProxy(url, noProxy)).toEqual(false);
});

test('proxy necessary - no proxy match multiple', () => {
  const url = 'https://wwww.example.test/test';
  const noProxy = 'www.example.com,wwww.example.org';

  expect(shouldUseProxy(url, noProxy)).toEqual(true);
});

test('proxy necessary - no proxy match', () => {
  const url = 'https://wwww.example.test/test';
  const noProxy = 'www.example.com';

  expect(shouldUseProxy(url, noProxy)).toEqual(true);
});

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
      proxyConfig: proxyMode === 'system' ? systemProxyConfig : manualProxyConfig,
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
