import http from 'node:http';
import https from 'node:https';
import { HttpProxyAgent } from 'http-proxy-agent';
import { getHttpHttpsAgents, PatchedHttpsProxyAgent } from '../../../utils/http-https-agents';
import * as common from './common';
import { WindowsProxyResolver } from './windows';

describe('Windows system proxy bypass', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['http://127.0.0.1:8080', false],
    ['https://127.0.0.1:8443', false],
    ['http://192.168.1.20', false],
    ['https://10.1.2.3', false],
    ['http://api.dev.example.com', false],
    ['https://api.dev.example.com', false],
    ['http://192.169.1.20', true],
    ['https://external.example.com', true]
  ])('routes %s with proxy=%s using ProxyOverride', async (requestUrl, useProxy) => {
    jest.spyOn(common, 'safeExec').mockResolvedValue([
      'HKEY_CURRENT_USER',
      '    ProxyEnable    REG_DWORD    0x1',
      '    ProxyServer    REG_SZ    proxy.example.com:3128',
      '    ProxyOverride    REG_SZ    localhost;127.*;192.168.*;10.*;api.*.example.com'
    ].join('\n'));

    const detected = await new WindowsProxyResolver().detect();
    const agents = await getHttpHttpsAgents({
      requestUrl,
      collectionPath: '',
      systemProxyConfig: {
        http_proxy: detected.http_proxy || undefined,
        https_proxy: detected.https_proxy || undefined,
        no_proxy: detected.no_proxy || undefined
      },
      options: {
        noproxy: false,
        shouldVerifyTls: true,
        shouldUseCustomCaCertificate: false,
        shouldKeepDefaultCaCertificates: true
      }
    });

    try {
      if (requestUrl.startsWith('https:')) {
        expect(agents.httpsAgent?.constructor).toBe(useProxy ? PatchedHttpsProxyAgent : https.Agent);
      } else {
        expect(agents.httpAgent?.constructor).toBe(useProxy ? HttpProxyAgent : http.Agent);
      }
    } finally {
      agents.httpAgent?.destroy();
      agents.httpsAgent?.destroy();
    }
  });
});
