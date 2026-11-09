import { parse as parseUrl, type Url } from 'node:url';

const DEFAULT_PORTS: Record<string, number> = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};

/** Determines whether a URL should use the proxy, based on the bypass list. */
export const shouldUseProxy = (url: string | Url | undefined, proxyBypass: string | undefined): boolean => {
  if (proxyBypass === '*') {
    return false; // Never proxy if wildcard is set.
  }

  // use proxy if no proxyBypass is set
  if (!proxyBypass || typeof proxyBypass !== 'string' || !proxyBypass.trim()) {
    return true;
  }

  const parsedUrl: Partial<Url> = typeof url === 'string' ? parseUrl(url) : url || {};
  let proto = parsedUrl.protocol;
  let hostname = parsedUrl.host;
  const port = parsedUrl.port;
  if (typeof hostname !== 'string' || !hostname || typeof proto !== 'string') {
    return false; // Don't proxy URLs without a valid scheme or host.
  }

  proto = proto.split(':', 1)[0];
  // Stripping ports in this way instead of using parsedUrl.hostname to make
  // sure that the brackets around IPv6 addresses are kept.
  hostname = hostname.replace(/:\d*$/, '');
  const portNum = parseInt(port || '', 10) || DEFAULT_PORTS[proto] || 0;

  return proxyBypass.split(/[,;\s]/).every(function (dontProxyFor) {
    if (!dontProxyFor) {
      return true; // Skip zero-length hosts.
    }
    const parsedProxy = dontProxyFor.match(/^(.+):(\d+)$/);
    const parsedProxyHostname = parsedProxy ? parsedProxy[1] : dontProxyFor;
    const parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2], 10) : 0;
    if (parsedProxyPort && parsedProxyPort !== portNum) {
      return true; // Skip if ports don't match.
    }

    if (parsedProxyHostname.includes('*')) {
      // Match literal segments in order so only '*' has wildcard semantics.
      const parts = parsedProxyHostname.split('*');
      const prefix = parts[0];
      const suffix = parts[parts.length - 1];
      if (!hostname.startsWith(prefix) || !hostname.endsWith(suffix)) {
        return true;
      }

      let position = prefix.length;
      const suffixStart = hostname.length - suffix.length;
      for (const part of parts.slice(1, -1)) {
        const match = hostname.indexOf(part, position);
        if (match === -1) return true;
        position = match + part.length;
      }
      // Literal segments must not overlap, even when '*' matches an empty string.
      return position > suffixStart;
    }

    if (parsedProxyHostname.startsWith('.')) {
      return !hostname.endsWith(parsedProxyHostname);
    }

    return hostname !== parsedProxyHostname;
  });
};
