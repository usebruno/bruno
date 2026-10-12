import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import https from 'node:https';
import { agentToProxyInfo } from '../../src/http2/proxy-info';
import { PatchedHttpsProxyAgent } from '../../src/utils/http-https-agents';

describe('agentToProxyInfo', () => {
  test('HTTP CONNECT proxy', () => {
    const info = agentToProxyInfo(new HttpsProxyAgent('http://localhost:8888'));
    expect(info).toMatchObject({ kind: 'http', url: 'http://localhost:8888/' });
  });
  test('HTTPS CONNECT proxy carries proxy TLS fields', () => {
    const info = agentToProxyInfo(new HttpsProxyAgent('https://localhost:8443', { ca: 'CA', rejectUnauthorized: true }));
    expect(info?.kind).toBe('https');
    expect(info?.proxyTls).toMatchObject({ ca: 'CA', rejectUnauthorized: true });
  });
  test('PatchedHttpsProxyAgent is treated as an HTTP(S) proxy', () => {
    const info = agentToProxyInfo(new PatchedHttpsProxyAgent('http://u:p@localhost:8888', {}));
    expect(info).toMatchObject({ kind: 'http', url: 'http://u:p@localhost:8888/' });
  });
  test('SOCKS5 proxy with credentials (non-enumerable)', () => {
    const info = agentToProxyInfo(new SocksProxyAgent('socks5://user:pass@localhost:1080'));
    expect(info).toMatchObject({ kind: 'socks', url: 'socks5://user:pass@localhost:1080' });
  });
  test('SOCKS4 proxy', () => {
    const info = agentToProxyInfo(new SocksProxyAgent('socks4://localhost:1080'));
    expect(info?.url).toBe('socks4://localhost:1080');
  });
  test('plain https.Agent is not a proxy', () => {
    expect(agentToProxyInfo(new https.Agent())).toBeNull();
    expect(agentToProxyInfo(undefined)).toBeNull();
  });
});
