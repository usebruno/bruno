/**
 * Converts HTTP/1.1 proxy agents into proxy settings for HTTP/2.
 */
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { pickTlsFields } from './tls-options';

export type ProxyKind = 'http' | 'https' | 'socks';

export type ProxyInfo = {
  kind: ProxyKind;
  url: string;
  key: string;
  proxyTls?: Record<string, unknown> | null;
};

type SocksProxyShape = { host: string; port: number; type: 4 | 5; userId?: string; password?: string };

const socksToProxyInfo = (agent: SocksProxyAgent): ProxyInfo => {
  const proxy = agent.proxy as unknown as SocksProxyShape;
  const scheme = proxy.type === 4 ? 'socks4' : 'socks5';
  const auth = proxy.userId
    ? `${encodeURIComponent(proxy.userId)}:${encodeURIComponent(proxy.password ?? '')}@`
    : '';
  const url = `${scheme}://${auth}${proxy.host}:${proxy.port}`;

  return { kind: 'socks', url, key: `socks|${url}` };
};

const httpConnectToProxyInfo = (agent: HttpsProxyAgent<string>): ProxyInfo => {
  const proxy = agent.proxy;
  const kind = proxy.protocol === 'https:' ? 'https' : 'http';
  const url = proxy.href;

  // HTTPS proxies need their own TLS options to verify the proxy's certificate.
  const proxyTls = kind === 'https'
    ? pickTlsFields((agent as unknown as { connectOpts?: Record<string, unknown> }).connectOpts)
    : undefined;

  return { kind, url, key: `${kind}|${url}`, proxyTls };
};

/**
 * Extract proxy settings from http1 agent, or return null for direct connections.
 */
export function agentToProxyInfo(agent: unknown): ProxyInfo | null {
  if (agent instanceof SocksProxyAgent) return socksToProxyInfo(agent);
  if (agent instanceof HttpsProxyAgent) return httpConnectToProxyInfo(agent);
  return null;
}
