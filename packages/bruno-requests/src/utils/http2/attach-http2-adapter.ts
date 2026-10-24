import type { LookupFunction } from 'node:net';
import { resolveHttpVersionViaAlpn } from './alpn';
import { createHttp2Adapter } from './http2-adapter';
import type { HttpVersionMode } from './tls-connect-options';

type TimelineEntry = { timestamp: Date; type: string; message: string };

export const canUseHttp2 = (requestedHttpVersion: string): boolean =>
  requestedHttpVersion === 'auto' || requestedHttpVersion === 'http2';

export type AttachHttp2AdapterParams = {
  config: any;
  requestedHttpVersion: HttpVersionMode;
  tlsOptions?: Record<string, unknown> | null;
  proxyUri?: string | null;
  lookup?: LookupFunction;
  timeline?: TimelineEntry[];
};

/**
 * Resolve the HTTP version via ALPN and, when it is HTTP/2, attach the h2
 * adapter to the axios config.
 */
export const attachHttp2Adapter = async ({ config, requestedHttpVersion, tlsOptions, proxyUri, lookup, timeline }: AttachHttp2AdapterParams): Promise<void> => {
  if (!canUseHttp2(requestedHttpVersion)) {
    return;
  }

  const httpVersionDecision = await resolveHttpVersionViaAlpn({
    url: config.url,
    mode: requestedHttpVersion,
    tlsOptions,
    proxyUri,
    lookup: lookup ?? config.lookup
  });

  if (Array.isArray(timeline) && httpVersionDecision.offered && httpVersionDecision.offered.length > 0) {
    timeline.push({
      timestamp: new Date(),
      type: 'tls',
      message: `ALPN: offered ${httpVersionDecision.offered.join(', ')} · server accepted ${httpVersionDecision.acceptedAlpnProtocol || 'none'}`
    });
  }

  if (httpVersionDecision.httpVersion === 2) {
    config.adapter = createHttp2Adapter({ tlsOptions, proxyUri });
    if (Array.isArray(timeline)) {
      let isCleartext = false;
      try {
        isCleartext = new URL(config.url).protocol !== 'https:';
      } catch {
        // leave isCleartext false if the URL can't be parsed
      }
      let message: string;
      if (isCleartext) {
        message = 'HTTP/2 selected (h2c prior knowledge over cleartext)';
      } else if (httpVersionDecision.acceptedAlpnProtocol === 'h2') {
        message = 'HTTP/2 selected (ALPN negotiated)';
      } else {
        message = 'HTTP/2 selected (forced, no ALPN)';
      }
      timeline.push({ timestamp: new Date(), type: 'info', message });
    }
    return;
  }

  // Clear any stale h2 adapter carried over from a previous redirect hop.
  if (config.adapter) {
    delete config.adapter;
  }

  if (Array.isArray(timeline)) {
    timeline.push({
      timestamp: new Date(),
      type: 'info',
      message: `HTTP/1.1 selected (${httpVersionDecision.reason})`
    });
  }
};
