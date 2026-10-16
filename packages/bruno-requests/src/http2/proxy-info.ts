/**
 * Proxy settings for HTTP/2, derived from the proxy URL the proxy setup already built.
 */
import { pickTlsFields } from './tls-options';

export type ProxyKind = 'http' | 'https' | 'socks';

export type ProxyInfo = {
  kind: ProxyKind;
  url: string;
  key: string;
  proxyTls?: Record<string, unknown> | null;
};

const kindFromScheme = (scheme: string): ProxyKind => {
  if (scheme.startsWith('socks')) return 'socks';
  if (scheme === 'https') return 'https';
  return 'http';
};

/**
 * Build HTTP/2 proxy settings from a proxy URL.
 */
export function proxyUrlToProxyInfo(
  proxyUrl: string | null | undefined,
  proxyTls?: Record<string, unknown> | null
): ProxyInfo | null {
  if (!proxyUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    return null;
  }

  const scheme = parsed.protocol.replace(/:$/, '').toLowerCase();
  const kind = kindFromScheme(scheme);

  return {
    kind,
    url: proxyUrl,
    key: `${kind}|${proxyUrl}`,
    proxyTls: kind === 'https' ? pickTlsFields(proxyTls) : undefined
  };
}
