import tls from 'node:tls';
import type { LookupFunction } from 'node:net';
import { applySecureContext } from '../agent-cache';

export type HttpVersionMode = 'auto' | 'http1.1' | 'http2';

/** ALPN protocols offered per mode. 'auto' offers both (server picks); 'http2' forces h2. */
export const ALPN_BY_MODE: Record<HttpVersionMode, string[] | undefined> = {
  'auto': ['h2', 'http/1.1'],
  'http2': ['h2'],
  'http1.1': ['http/1.1']
};

const TLS_FIELDS = [
  'ca',
  'secureContext',
  'cert',
  'key',
  'pfx',
  'passphrase',
  'rejectUnauthorized',
  'servername',
  'minVersion',
  'maxVersion',
  'ciphers',
  'secureProtocol'
] as const;

/** Keep only TLS fields, dropping HTTP-agent settings (keepAlive, maxSockets, …). */
export function pickTlsFields(options?: Record<string, unknown> | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!options) return out;
  for (const field of TLS_FIELDS) {
    if (options[field] !== undefined) out[field] = options[field];
  }
  return out;
}

/**
 * Node's HTTP/2 connection may request DNS results as an array (options.all). wrap lookup, so `all` callers get
 * an array while existing arrays pass through unchanged.
 */
export function wrapLookup(lookup: LookupFunction): LookupFunction {
  return ((hostname: string, options: any, callback: any) => {
    lookup(hostname, options, (err: Error | null, address: any, family?: number) => {
      if (err) return callback(err);
      if (options && options.all && !Array.isArray(address)) {
        return callback(null, [{ address, family }]);
      }
      return callback(null, address, family);
    });
  }) as unknown as LookupFunction;
}

export type BuildTlsConnectOptionsParams = {
  hostname: string;
  port: number;
  tlsOptions?: Record<string, unknown> | null;
  mode: HttpVersionMode;
  lookup?: LookupFunction;
};

export function buildTlsConnectOptions({
  hostname,
  port,
  tlsOptions,
  mode,
  lookup
}: BuildTlsConnectOptionsParams): tls.ConnectionOptions {
  // Remove IPv6 brackets (e.g. "[::1]" → "::1") so TLS connects to the correct IP
  // and certificate verification works.
  const connectHost = hostname.replace(/^\[|\]$/g, '');
  const picked = pickTlsFields(tlsOptions);

  const opts: tls.ConnectionOptions = {
    ...(applySecureContext(picked as any) as tls.ConnectionOptions),
    host: connectHost,
    port,
    servername: connectHost,
    rejectUnauthorized: picked.rejectUnauthorized !== undefined ? (picked.rejectUnauthorized as boolean) : true
  };

  const alpn = ALPN_BY_MODE[mode];
  if (alpn) opts.ALPNProtocols = alpn;
  if (lookup) opts.lookup = wrapLookup(lookup);

  return opts;
}
