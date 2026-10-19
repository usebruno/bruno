/**
 * Select the HTTP version for a request and configure the HTTP/2 transport.
 */

import { isIP } from 'node:net';
import { checkServerIdentity as tlsCheckServerIdentity } from 'node:tls';
import type { LookupFunction } from 'node:net';
import {
  resolveHttpVersion,
  invalidateAlpn,
  HTTP_VERSION,
  type HttpVersionPreference
} from './alpn';
import { acquireH2Session } from './session';
import { acquireH2SessionViaProxy } from './proxy-session';
import { createHttp2Transport } from './transport';
import type { ProxyInfo } from './proxy-info';

export type Http2TimelineEntry = { timestamp: Date; type: string; message: string };

export type ApplyHttp2TransportParams = {
  config: { url: string; lookup?: LookupFunction; transport?: unknown } & Record<string, unknown>;
  httpVersionPreference: HttpVersionPreference;
  tlsOptions?: Record<string, unknown> | null;
  proxyInfo?: ProxyInfo | null;
  timeline?: Http2TimelineEntry[];
};

export async function applyHttp2Transport(params: ApplyHttp2TransportParams): Promise<void> {
  const { config, httpVersionPreference, tlsOptions, proxyInfo, timeline } = params;

  const log = (type: string, message: string) => {
    if (timeline) timeline.push({ timestamp: new Date(), type, message });
  };

  // Redirects reuse the same config, so clear any transport from the previous hop.
  delete config.transport;

  const parsed = new URL(config.url);
  const isHttps = parsed.protocol === 'https:';
  const port = Number(parsed.port) || (isHttps ? 443 : 80);
  const origin = `${parsed.protocol}//${parsed.hostname}:${port}`;
  const lookup = config.lookup;

  // URL.hostname keeps the brackets for an IPv6 literal ("[::1]"), which net.isIP rejects, so Node's
  // default TLS identity check treats it as a DNS name and misses the cert's IP SAN. Strip the brackets
  // before the identity check. We can't just override `servername` (http2-wrapper couples origin and
  // servername, which then throws "Origin [::1] differs from servername ::1").
  const bareHost = parsed.hostname.replace(/^\[|\]$/g, '');
  const isIpv6Literal = parsed.hostname !== bareHost && isIP(bareHost) === 6;
  const sessionTlsOptions
    = isIpv6Literal && !(tlsOptions && (tlsOptions as Record<string, unknown>).checkServerIdentity)
      ? {
          ...(tlsOptions || {}),
          checkServerIdentity: (host: string, cert: Parameters<typeof tlsCheckServerIdentity>[1]) =>
            tlsCheckServerIdentity(host.replace(/^\[|\]$/g, ''), cert)
        }
      : tlsOptions;

  // Try HTTP/2 through the proxy instead of probing the target directly.
  if (proxyInfo) {
    // Cleartext HTTP/2 through a proxy is not supported.
    if (!isHttps) {
      log('info', `HTTP/1.1 selected (HTTP/2 requires TLS)`);
      return;
    }

    if (httpVersionPreference === HTTP_VERSION.HTTP1) {
      log('info', 'HTTP/1.1 selected by preference');
      return;
    }

    try {
      const session = await acquireH2SessionViaProxy({ origin, proxyInfo, tlsOptions: sessionTlsOptions, lookup });
      config.transport = createHttp2Transport({ session });
      log('info', `HTTP/2 selected via ${proxyInfo.kind} proxy`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // Auto mode falls back to HTTP/1.1, but explicit HTTP/2 must fail.
      if (httpVersionPreference === HTTP_VERSION.HTTP2) {
        log('error', `HTTP/2 requested but no h2 session could be established via the ${proxyInfo.kind} proxy: ${message}`);
        throw err;
      }

      log('info', `HTTP/2 unavailable via the ${proxyInfo.kind} proxy (${message}); using HTTP/1.1`);
    }
    return;
  }

  // Direct connections use ALPN to select the protocol in auto mode.
  const resolved = await resolveHttpVersion({ url: config.url, httpVersionPreference, tlsOptions: sessionTlsOptions, lookup });

  if (resolved.offered && resolved.offered.length > 0) {
    log('tls', `ALPN: offered ${resolved.offered.join(', ')} · server selected ${resolved.alpn || 'none'}${resolved.cached ? ' (cached)' : ''}`);
  }

  if (resolved.protocol !== 'http2') {
    log('info', `HTTP/1.1 selected (${resolved.reason})`);
    return;
  }

  try {
    const session = await acquireH2Session({ origin, tlsOptions: sessionTlsOptions, lookup });
    config.transport = createHttp2Transport({ session });
    log('info', `HTTP/2 selected (${resolved.reason})`);
  } catch (err) {
    // Clear the cached ALPN result so the next request checks again.
    invalidateAlpn(parsed.hostname, port);

    const message = err instanceof Error ? err.message : String(err);

    if (httpVersionPreference === HTTP_VERSION.HTTP2) {
      log('error', `HTTP/2 requested but no h2 session could be established: ${message}`);
      throw err;
    }

    log('info', `HTTP/2 unavailable (${message}); using HTTP/1.1`);
  }
}
