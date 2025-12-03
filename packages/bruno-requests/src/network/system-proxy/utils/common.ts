/**
 * Normalizes a proxy URL by ensuring it includes a protocol.
 * @param proxy - The proxy URL to normalize (e.g., "proxy.usebruno.com:8080").
 * @param defaultProtocol - The protocol to prepend if missing (default: "http").
 * @returns The normalized proxy URL (e.g., "http://proxy.usebruno.com:8080").
 *
 * Notes:
 * - If the URL already includes a protocol (e.g., "https://..."), it is returned unchanged.
 * - When system proxy settings omit the protocol,
 *   this function cannot infer the original protocol and will apply the default ("http").
 */

export const normalizeProxyUrl = (proxy: string, defaultProtocol: string = 'http'): string => {
  if (!proxy) return proxy;

  // Check if proxy already has a protocol (must have :// after protocol name)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(proxy)) {
    return proxy;
  }

  // Add default protocol
  return `${defaultProtocol}://${proxy}`;
};

/**
 * Normalizes no_proxy list to comma-separated format
 * @param noProxy - The no_proxy string (e.g., "localhost;127.0.0.1")
 * @returns Normalized comma-separated no_proxy list (e.g., "localhost,127.0.0.1")
 */
export const normalizeNoProxy = (noProxy: string | null): string | null => {
  if (!noProxy) return null;

  const normalized = noProxy
    .split(/[;,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(',');

  return normalized || null;
};
