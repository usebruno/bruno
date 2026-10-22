import tls from 'node:tls';
import type { LookupFunction } from 'node:net';
import { applySecureContext } from '../agent-cache';

export type HttpVersionMode = 'auto' | 'http1' | 'http2';

export const ALPN_BY_MODE: Record<HttpVersionMode, string[]> = {
  auto: ['h2', 'http/1.1'],
  http1: ['http/1.1'],
  http2: ['h2']
};

export const TLS_FIELDS = [
  'ca', 'cert', 'key', 'pfx', 'passphrase',
  'rejectUnauthorized', 'minVersion', 'maxVersion', 'secureProtocol', 'secureContext',
  'ciphers', 'crl'
] as const;

export type BrunoTlsOptions = Partial<Pick<tls.ConnectionOptions, (typeof TLS_FIELDS)[number]>>;

// Keep only the TLS fields.
export function pickTlsFields(input: object | undefined): BrunoTlsOptions {
  const out: Record<string, unknown> = {};
  if (!input) {
    return out;
  }
  const src = input as Record<string, unknown>;
  for (const field of TLS_FIELDS) {
    if (src[field] !== undefined) {
      out[field] = src[field];
    }
  }
  return out as BrunoTlsOptions;
}

// Remove IPv6 brackets so tls.connect receives a valid IP address.
export const stripIpv6Brackets = (host: string): string => host.replace(/^\[|\]$/g, '');

/** Wrap a bare IPv6 literal in brackets so it is valid inside a URL authority (e.g. ::1 -> [::1]). */
export const bracketIpv6 = (host: string): string =>
  host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;

/**
 * Node may request multiple addresses using `all: true`,
 * Convert it to the expected array format
 */
export function wrapLookup(lookup: LookupFunction): LookupFunction {
  return ((hostname: string, options: any, callback: any) =>
    lookup(hostname, options, (err: any, address: any, family?: number) => {
      if (err) return callback(err);
      if (options && options.all) {
        return callback(null, Array.isArray(address) ? address : [{ address, family }]);
      }
      return callback(null, address, family);
    })) as LookupFunction;
}

export type BuildTlsConnectOptionsParams = {
  hostname: string;
  port?: number;
  tlsOptions?: object;
  mode?: HttpVersionMode;
  lookup?: LookupFunction;
};

// Build TLS connection options for both `tls.connect()` and `http2.connect()`.
export function buildTlsConnectOptions({
  hostname,
  port = 443,
  tlsOptions = {},
  mode = 'auto',
  lookup
}: BuildTlsConnectOptionsParams): tls.ConnectionOptions {
  if (!(mode in ALPN_BY_MODE)) {
    throw new TypeError(`buildTlsConnectOptions: unknown mode '${mode}'`);
  }

  const tlsOnly = pickTlsFields(tlsOptions);
  // An IPv6 URL host arrives bracketed; tls.connect and the identity check want the bare address.
  const host = stripIpv6Brackets(hostname);

  const opts: tls.ConnectionOptions = {
    ...(applySecureContext(tlsOnly as any) as tls.ConnectionOptions),
    host,
    port,
    servername: host,
    rejectUnauthorized: tlsOnly.rejectUnauthorized !== undefined ? tlsOnly.rejectUnauthorized : true
  };

  opts.ALPNProtocols = ALPN_BY_MODE[mode];

  if (lookup) {
    opts.lookup = wrapLookup(lookup);
  }

  return opts;
}

export type ConnectTlsParams = BuildTlsConnectOptionsParams & { timeoutMs?: number };

export type ConnectTlsResult = {
  socket: tls.TLSSocket;
  mode: HttpVersionMode;
  offered: string[];
  alpn: string | null;
  authorized: boolean;
  authorizationError: string | null;
  protocol: string | null;
  cipher: string | null;
  peerSubject: string | null;
  peerAltNames: string | null;
  handshakeMs: number;
};

// open a TLS connection to the origin.
export function establishTlsConnection(params: ConnectTlsParams): Promise<ConnectTlsResult> {
  const { timeoutMs = 10_000, mode = 'auto' } = params;
  const opts = buildTlsConnectOptions(params);

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const socket = tls.connect(opts);

    // tls.connect() has no overall deadline: if a firewall drops packets silently, or a server
    // accepts TCP but never finishes the handshake, neither 'secureConnect' nor 'error' fires.
    const timer = setTimeout(() => {
      socket.destroy(new Error(`establishTlsConnection: TLS connect timed out after ${timeoutMs} ms`));
    }, timeoutMs);

    const onError = (err: Error) => {
      clearTimeout(timer);
      reject(err);
    };

    socket.once('secureConnect', () => {
      clearTimeout(timer);
      socket.removeListener('error', onError);
      const cipher = socket.getCipher();
      const peer = socket.getPeerCertificate();
      resolve({
        socket,
        mode,
        offered: ALPN_BY_MODE[mode],
        alpn: typeof socket.alpnProtocol === 'string' ? socket.alpnProtocol : null,
        authorized: socket.authorized,
        authorizationError: socket.authorizationError ? String(socket.authorizationError) : null,
        protocol: socket.getProtocol(),
        cipher: cipher ? `${cipher.name} (${cipher.version})` : null,
        peerSubject: peer && peer.subject ? peer.subject.CN ?? null : null,
        peerAltNames: peer && peer.subjectaltname ? peer.subjectaltname : null,
        handshakeMs: Date.now() - startedAt
      });
    });
    socket.once('error', onError);
  });
}
