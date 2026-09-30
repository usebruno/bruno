import tls from 'node:tls';
import type { LookupFunction } from 'node:net';
import { applySecureContext } from '../agent-cache';

/**
 * TLS configuration for HTTP/2.
 *
 * This is the one translation point between Bruno's TLS configuration (the `tlsOptions`
 * object that `setupProxyAgents()` builds in bruno-electron/src/utils/proxy-util.js) and
 * what Node's `tls.connect()` / `http2.connect()` accept. The session pool, the auto-mode
 * resolver and the proxy tunnel all go through here, so they share identical TLS
 * behaviour: custom CA, client certificate, verification flag, ALPN.
 *
 * It reuses `applySecureContext()` from the agent cache so custom CAs and client certs
 * reach the socket exactly as they do on the HTTP/1.1 path (see that function for why a
 * raw `ca` option would drop OpenSSL's default trust store).
 */

export type HttpVersionMode = 'auto' | 'http1' | 'http2' | 'http2-prior-knowledge';

export const ALPN_BY_MODE: Record<HttpVersionMode, string[] | undefined> = {
  'auto': ['h2', 'http/1.1'],
  'http1': ['http/1.1'],
  'http2': ['h2'],
  'http2-prior-knowledge': undefined
};

// ---------------------------------------------------------------------------
// TLS fields
// ---------------------------------------------------------------------------

/**
 * The tls.connect() fields Bruno's tlsOptions can carry. Mirrors TARGET_TLS_OPTIONS in
 * http-https-agents.ts
 */
export const TLS_FIELDS = [
  'ca', 'cert', 'key', 'pfx', 'passphrase',
  'rejectUnauthorized', 'minVersion', 'maxVersion', 'secureProtocol', 'secureContext',
  'ciphers', 'crl'
] as const;

export type BrunoTlsOptions = Partial<Pick<tls.ConnectionOptions, (typeof TLS_FIELDS)[number]>>;

/** Keep only the TLS fields. the input is whatever setupProxyAgents() built. */
export function pickTlsFields(input: object | undefined): BrunoTlsOptions {
  const out: Record<string, unknown> = {};
  if (!input) return out;
  const src = input as Record<string, unknown>;
  for (const field of TLS_FIELDS) {
    if (src[field] !== undefined) out[field] = src[field];
  }
  return out as BrunoTlsOptions;
}

// ---------------------------------------------------------------------------
// DNS lookup adapter
// ---------------------------------------------------------------------------

/**
 * Bruno's lookup (axios-instance.js, the `*.localhost` / 127.0.0.1 / ::1 handling) calls
 * back with `(err, address, family)`. Node's net layer may call lookup with `{ all: true }`
 * and then expects an array of `{ address, family }`; without this adapter
 * `http2.connect()` fails with ERR_INVALID_IP_ADDRESS.
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

// ---------------------------------------------------------------------------
// TLS connect options
// ---------------------------------------------------------------------------

export type BuildTlsConnectOptionsParams = {
  hostname: string;
  port?: number;
  /** Bruno's tlsOptions object as built by setupProxyAgents(); non-TLS fields are ignored. */
  tlsOptions?: object;
  mode?: HttpVersionMode;
  /** Bruno's custom resolver (the `*.localhost` handling), in its `(err, ip, family)` form. */
  lookup?: LookupFunction;
};

/**
 * Turn Bruno's TLS configuration into an options object that both `tls.connect()` and
 * `http2.connect(origin, options)` accept. Synchronous, so the session pool can hand the
 * result straight to Node.
 *
 *   tlsOptions ── pickTlsFields ──▶ TLS fields only
 *              ── applySecureContext ──▶ ca / cert / key / pfx folded into a secureContext
 *              ── + host, port, servername, rejectUnauthorized, ALPNProtocols, lookup
 */
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

  const opts: tls.ConnectionOptions = {
    ...(applySecureContext(tlsOnly as any) as tls.ConnectionOptions),
    host: hostname,
    port,
    // SNI: the server needs the hostname during the handshake to present the right certificate.
    servername: hostname,
    rejectUnauthorized: tlsOnly.rejectUnauthorized !== undefined ? tlsOnly.rejectUnauthorized : true
  };

  // Only set the key when the mode offers something. For prior knowledge the key must be
  // absent altogether: `ALPNProtocols: undefined` is not the same as "no ALPN" to Node.
  const alpn = ALPN_BY_MODE[mode];
  if (alpn) opts.ALPNProtocols = alpn;

  if (lookup) opts.lookup = wrapLookup(lookup);

  return opts;
}

// ---------------------------------------------------------------------------
// Probe-style connect (observe a handshake without making a request)
// ---------------------------------------------------------------------------

export type ConnectTlsParams = BuildTlsConnectOptionsParams & { timeoutMs?: number };

export type ConnectTlsResult = {
  /** The connected socket; the caller owns it and must destroy() or hand it on. */
  socket: tls.TLSSocket;
  mode: HttpVersionMode;
  /** What we offered in ALPN, or null when the mode offers nothing. */
  offered: string[] | null;
  /** 'h2' | 'http/1.1' | null when nothing was negotiated (no ALPN offered, or server declined). */
  alpn: string | null;
  authorized: boolean;
  authorizationError: string | null;
  protocol: string | null;
  cipher: string | null;
  peerSubject: string | null;
  peerAltNames: string | null;
  handshakeMs: number;
};

/**
 * Open a TLS connection using Bruno's tlsOptions shape and report what was negotiated.
 * Used by the P0 probes and by the auto-mode resolver ("what does this server speak?").
 * Resolves after the handshake (`secureConnect`); rejects on any error before that.
 */
export function connectTls(params: ConnectTlsParams): Promise<ConnectTlsResult> {
  const { timeoutMs = 10_000, mode = 'auto' } = params;
  const opts = buildTlsConnectOptions(params);

  return new Promise((resolve, reject) => {
    const started = Date.now();
    const socket = tls.connect(opts);

    // tls.connect() has no overall deadline of its own. If a firewall drops packets
    // silently, or a server accepts TCP but never finishes the handshake, neither
    // 'secureConnect' nor 'error' fires and this promise would hang forever. Destroying
    // the socket with an error routes the timeout through the normal 'error' path, so the
    // caller sees an ordinary rejection. On the h1 path axios's `timeout` covers this.
    const timer = setTimeout(() => {
      socket.destroy(new Error(`connectTls: TLS connect timeout after ${timeoutMs} ms`));
    }, timeoutMs);

    const onError = (err: Error) => {
      clearTimeout(timer);
      reject(err);
    };

    // registers a one-time listener for the moment the TLS handshake finishes.
    // Everything inside it reads the result of that handshake off the socket.
    socket.once('secureConnect', () => {
      clearTimeout(timer);
      socket.removeListener('error', onError);
      const cipher = socket.getCipher();
      const peer = socket.getPeerCertificate();
      resolve({
        socket,
        mode,
        offered: ALPN_BY_MODE[mode] ?? null,
        // Node reports `false` when nothing was negotiated; normalise to null.
        alpn: typeof socket.alpnProtocol === 'string' ? socket.alpnProtocol : null,
        authorized: socket.authorized,
        authorizationError: socket.authorizationError ? String(socket.authorizationError) : null,
        protocol: socket.getProtocol(),
        cipher: cipher ? `${cipher.name} (${cipher.version})` : null,
        peerSubject: peer && peer.subject ? peer.subject.CN ?? null : null,
        peerAltNames: peer && peer.subjectaltname ? peer.subjectaltname : null,
        handshakeMs: Date.now() - started
      });
    });
    socket.once('error', onError);
  });
}
