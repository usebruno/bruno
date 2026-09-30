/**
 * Decide, per origin, whether a request should use HTTP/2 (POC).
 *
 * axios's built-in HTTP/2 is prior-knowledge only: `httpVersion: 2` offers ALPN 'h2' and nothing else, so an
 * HTTP/1.1-only server fails the TLS handshake (NO_APPLICATION_PROTOCOL) instead of falling back. Nothing
 * inside one request can recover from that, so the choice has to be made before the request: open one TLS
 * socket offering ['h2', 'http/1.1'], read what the server picked, cache it per origin + TLS config.
 * Runs per hop from the request interceptor, so redirect chains that cross to an h1-only host keep working.
 */
const tls = require('tls');
const crypto = require('crypto');
const { applySecureContext } = require('@usebruno/requests');

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const PROBE_TIMEOUT_MS = 10 * 1000;
const alpnCache = new Map(); // key -> { alpn: 'h2' | 'http/1.1' | null, expiresAt }

const hash = (value) => {
  if (value === undefined || value === null) return '';
  const list = Array.isArray(value) ? value : [value];
  const h = crypto.createHash('sha256');
  for (const v of list) h.update(Buffer.isBuffer(v) ? v : String(v));
  return h.digest('hex').slice(0, 16);
};

/** Same inputs the agent cache keys on: TLS material, verification, proxy. */
const cacheKey = ({ origin, tlsOptions = {}, proxyUri }) =>
  [
    origin,
    hash(tlsOptions.ca),
    hash(tlsOptions.cert),
    hash(tlsOptions.key),
    hash(tlsOptions.pfx),
    hash(tlsOptions.passphrase),
    tlsOptions.rejectUnauthorized === false ? 'insecure' : 'verify',
    tlsOptions.minVersion || '',
    proxyUri || 'direct'
  ].join('|');

const wrapLookup = (lookup) => (hostname, options, callback) => {
  const wantAll = options && options.all;
  lookup(hostname, options, (err, address, family) => {
    if (err) return callback(err);
    if (Array.isArray(address)) return callback(null, address);
    callback(null, wantAll ? [{ address, family }] : address, family);
  });
};

/** One TLS handshake offering both protocols. resolves to the negotiated ALPN ('h2' | 'http/1.1' | null). Never rejects. */
const probeAlpn = ({ hostname, port, tlsOptions = {}, lookup }) =>
  new Promise((resolve) => {
    const { keepAlive, proxy, caCertificatesCount, ...tlsOnly } = tlsOptions;
    const options = {
      ...applySecureContext({ ...tlsOnly }),
      host: hostname,
      port,
      servername: hostname,
      ALPNProtocols: ['h2', 'http/1.1'],
      rejectUnauthorized: tlsOnly.rejectUnauthorized !== false
    };
    if (typeof lookup === 'function') options.lookup = wrapLookup(lookup);

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    };
    const socket = tls.connect(options);
    const timer = setTimeout(() => finish({ alpn: null, error: `ALPN probe timed out after ${PROBE_TIMEOUT_MS} ms` }), PROBE_TIMEOUT_MS);
    socket.once('secureConnect', () => finish({ alpn: socket.alpnProtocol || null, protocol: socket.getProtocol() }));
    socket.once('error', (err) => finish({ alpn: null, error: err.message }));
  });

/**
 * @returns {Promise<{ httpVersion: 1 | 2, reason: string }>}
 * mode: 'http1' | 'http2' | 'http2-prior-knowledge' | 'auto'
 */
const resolveHttpVersion = async ({ url, mode = 'auto', tlsOptions, lookup, proxyUri, ttlMs = DEFAULT_TTL_MS }) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    return { httpVersion: 1, reason: 'unparseable URL' };
  }
  if (parsed.protocol !== 'https:') return { httpVersion: 1, reason: 'cleartext URL (h2c not supported)' };
  if (mode === 'http1') return { httpVersion: 1, reason: 'mode http1' };
  if (mode === 'http2' || mode === 'http2-prior-knowledge') return { httpVersion: 2, reason: `mode ${mode}` };

  const port = Number(parsed.port) || 443;
  const origin = `${parsed.hostname}:${port}`;
  const key = cacheKey({ origin, tlsOptions, proxyUri });
  const cached = alpnCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { httpVersion: cached.alpn === 'h2' ? 2 : 1, reason: `ALPN cache: ${cached.alpn || 'none'}` };
  }

  const probe = await probeAlpn({ hostname: parsed.hostname, port, tlsOptions, lookup });
  if (probe.error) {
    // Do not cache. let the real request surface the real error on the h1 path.
    return { httpVersion: 1, reason: `ALPN probe failed (${probe.error}). using HTTP/1.1` };
  }
  alpnCache.set(key, { alpn: probe.alpn, expiresAt: Date.now() + ttlMs });
  return { httpVersion: probe.alpn === 'h2' ? 2 : 1, reason: `ALPN probe: server chose ${probe.alpn || 'none'} (${probe.protocol})` };
};

const invalidateAlpn = (origin) => {
  for (const key of alpnCache.keys()) if (key.startsWith(`${origin}|`)) alpnCache.delete(key);
};
const clearAlpnCache = () => alpnCache.clear();

module.exports = { resolveHttpVersion, probeAlpn, invalidateAlpn, clearAlpnCache };
