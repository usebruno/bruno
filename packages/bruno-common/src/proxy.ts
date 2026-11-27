export interface ProxyTargetProtocols {
  http?: boolean;
  https?: boolean;
}

export interface NormalizedProxyTargetProtocols {
  http: boolean;
  https: boolean;
}

export const DEFAULT_PROXY_TARGET_PROTOCOLS: NormalizedProxyTargetProtocols = {
  http: true,
  https: true
};

/**
 * Normalizes target request protocols that should be routed through the proxy.
 * Omitted or unspecified fields default to `true` for full backward compatibility.
 */
export const normalizeProxyTargetProtocols = (
  targetProtocols?: ProxyTargetProtocols | null
): NormalizedProxyTargetProtocols => ({
  http: targetProtocols?.http !== false,
  https: targetProtocols?.https !== false
});

/**
 * Returns true if the target request URL scheme is enabled for proxying.
 * Non-HTTP(S) schemes default to `true` so existing transports behave unchanged.
 */
export const isProxyEnabledForUrl = (
  targetProtocols: ProxyTargetProtocols | null | undefined,
  requestUrl: string | undefined
): boolean => {
  const normalized = normalizeProxyTargetProtocols(targetProtocols);
  if (!requestUrl) {
    return normalized.http || normalized.https;
  }

  try {
    const { protocol } = new URL(requestUrl);
    if (protocol === 'http:') return normalized.http;
    if (protocol === 'https:') return normalized.https;
  } catch {
    const lower = String(requestUrl).trim().toLowerCase();
    if (lower.startsWith('http:')) return normalized.http;
    if (lower.startsWith('https:')) return normalized.https;
  }

  return true;
};

/**
 * Returns `undefined` when both HTTP and HTTPS are enabled so persisted default configs
 * omit `targetProtocols`; returns `{ http, https }` when either protocol is disabled.
 */
export const serializeProxyTargetProtocols = (
  targetProtocols?: ProxyTargetProtocols | null
): NormalizedProxyTargetProtocols | undefined => {
  const normalized = normalizeProxyTargetProtocols(targetProtocols);
  if (normalized.http && normalized.https) {
    return undefined;
  }
  return normalized;
};
