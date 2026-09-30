/**
 * POC: make axios's built-in HTTP/2 (`httpVersion: 2`, lib/helpers/Http2Sessions.js) usable inside Bruno.
 *
 * axios opens sessions with `http2.connect(origin, http2Options)` and attaches no 'error' listener, so any
 * TLS / DNS / reset failure on the session is an uncaughtException in the main process. It also forwards
 * `http2Options` untouched, which means raw `ca` replaces the OpenSSL root store and Bruno's lookup
 * signature is rejected. Wrapping `http2.connect` once at startup fixes both from the outside.
 *
 * Not fixable here: proxies (axios's pool ignores agents, and a per-request createConnection defeats its
 * deep-equal session key), ALPN fallback, REFUSED_STREAM retry. See _h2lab/probes-axios-native.js.
 */
const http2 = require('http2');
const { applySecureContext } = require('@usebruno/requests');
const { proxyKeyFor, connectThroughProxy } = require('./http2-proxy');

const sessions = new Set();
let installed = false;

// axios keys its session pool by deep-equal on http2Options, so a createConnection function can never live there
// (functions are never deep-equal). Instead: a plain-string proxy marker goes into http2Options (pool keys per
// proxy), and the socket waits in a map keyed authority|proxyKey until patchedConnect picks it up.
const PROXY_OPTION = '__brunoProxy';
const PENDING_SOCKET_TTL_MS = 10 * 1000;
const pendingSockets = new Map(); // sessionKey -> { socket, timer }

const sessionKeyFor = (authority, proxyKey) => `${authority}|${proxyKey || 'direct'}`;

/** A tunnelled TLS socket the next http2.connect for this authority+proxy must use instead of dialling. */
const offerConnection = (authority, proxyKey, socket) => {
  const key = sessionKeyFor(authority, proxyKey);
  const previous = pendingSockets.get(key);
  if (previous) {
    clearTimeout(previous.timer);
    previous.socket.destroy();
  }
  const timer = setTimeout(() => {
    pendingSockets.delete(key);
    socket.destroy();
  }, PENDING_SOCKET_TTL_MS);
  timer.unref();
  pendingSockets.set(key, { socket, timer });
};

const takePendingSocket = (authority, proxyKey) => {
  const key = sessionKeyFor(authority, proxyKey);
  const entry = pendingSockets.get(key);
  if (!entry) return null;
  clearTimeout(entry.timer);
  pendingSockets.delete(key);
  return entry.socket.destroyed ? null : entry.socket;
};

/** True when a usable session for this authority+proxy is already open */
const hasLiveSession = (authority, proxyKey) => {
  const key = sessionKeyFor(authority, proxyKey);
  for (const session of sessions) {
    if (session.brunoSessionKey === key && !session.closed && !session.destroyed) return true;
  }
  return false;
};

/** Node's http2/tls lookup is called with { all: true } and expects an array; Bruno's lookup returns (err, ip, family). */
const wrapLookup = (lookup) => (hostname, options, callback) => {
  const wantAll = options && options.all;
  lookup(hostname, options, (err, address, family) => {
    if (err) return callback(err);
    if (Array.isArray(address)) return callback(null, address);
    callback(null, wantAll ? [{ address, family }] : address, family);
  });
};

/** Connection-specific headers an HTTP/2 client must not send (RFC 9113 §8.2.2); Node rejects them with ERR_HTTP2_INVALID_CONNECTION_HEADERS. */
const CONNECTION_HEADERS = ['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'http2-settings'];

/**
 * Remove connection-specific headers from an axios config.headers (AxiosHeaders or plain object) in place.
 * Returns the names removed, for the timeline. axios's http2Transport copies headers verbatim, so this has
 * to happen before the request reaches it.
 */
const stripConnectionHeaders = (headers) => {
  if (!headers) return [];
  const stripped = [];
  // TE is allowed on h2 only with the exact value 'trailers' (RFC 9113 §8.2.2); Node rejects anything else.
  const teForbidden = (value) => String(value).trim().toLowerCase() !== 'trailers';
  if (typeof headers.delete === 'function' && typeof headers.has === 'function') {
    for (const name of CONNECTION_HEADERS) {
      if (headers.has(name)) {
        headers.delete(name); stripped.push(name);
      }
    }
    if (headers.has('te') && teForbidden(headers.get('te'))) {
      headers.delete('te'); stripped.push('te');
    }
    return stripped;
  }
  for (const key of Object.keys(headers)) {
    const lower = key.toLowerCase();
    if (CONNECTION_HEADERS.includes(lower) || (lower === 'te' && teForbidden(headers[key]))) {
      delete headers[key]; stripped.push(lower);
    }
  }
  return stripped;
};

/**
 * axios turns config.auth (or user:pass@ in the URL) into options.auth and deletes any Authorization header,
 * relying on Node's http.ClientRequest to write the header; its http2Transport never reads options.auth, so on
 * h2 the credentials are lost. Write the header here and remove both inputs so axios leaves it alone.
 * Returns true when a header was applied.
 */
const applyBasicAuthHeader = (config) => {
  if (!config) return false;
  let username;
  let password;
  if (config.auth && typeof config.auth === 'object') {
    username = config.auth.username || '';
    password = config.auth.password || '';
  } else if (typeof config.url === 'string') {
    try {
      const parsed = new URL(config.url);
      if (parsed.username || parsed.password) {
        username = decodeURIComponent(parsed.username);
        password = decodeURIComponent(parsed.password);
        parsed.username = '';
        parsed.password = '';
        config.url = parsed.toString();
      }
    } catch (_) {
      return false;
    }
  }
  if (username === undefined) return false;
  const value = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  if (config.headers && typeof config.headers.set === 'function') config.headers.set('Authorization', value);
  else config.headers = { ...(config.headers || {}), Authorization: value };
  delete config.auth;
  return true;
};

/** Build http2Options from the same agent options Bruno hands to https.Agent, plus the request's lookup. */
const buildHttp2Options = (agentOptions = {}, lookup, proxyKey = null) => {
  const { keepAlive, proxy, caCertificatesCount, ...tlsOptions } = agentOptions;
  const options = {
    ...tlsOptions,
    rejectUnauthorized: tlsOptions.rejectUnauthorized !== false
  };
  if (typeof lookup === 'function') options.lookup = wrapLookup(lookup);
  if (proxyKey) options[PROXY_OPTION] = proxyKey; // plain string: pool keys sessions per proxy; stripped in patchedConnect
  return options;
};

/** Idempotent. Call once from main-process startup. */
const installHttp2NativePatch = () => {
  if (installed) return;
  installed = true;
  const realConnect = http2.connect;
  http2.connect = function patchedConnect(authority, options, listener) {
    // Node allows http2.connect(authority, listener). keep that shape intact.
    if (typeof options === 'function') {
      listener = options;
      options = undefined;
    }
    // secureContext keeps the default roots and folds in client certs — same treatment as the h1 agent.
    // Spread copies (or creates) the object so axios's pool-key object is never mutated.
    const resolved = applySecureContext({ ...options });
    // Change 3: proxied session? use the tunnel prepared for it; the marker never reaches Node.
    const proxyKey = resolved[PROXY_OPTION] || null;
    delete resolved[PROXY_OPTION];
    const normalizedAuthority = typeof authority === 'string' ? authority : String(authority);
    const pending = takePendingSocket(normalizedAuthority, proxyKey);
    if (pending) {
      resolved.createConnection = () => pending; // on the copy Node gets, not on http2Options (pool key stays plain data)
    } else if (proxyKey) {
      // Bruno decided this request goes through a proxy; without a tunnel Node would dial direct. Refuse instead.
      throw Object.assign(new Error(`HTTP/2: no proxy tunnel prepared for ${normalizedAuthority} via ${proxyKey}`), { code: 'ERR_BRUNO_H2_NO_TUNNEL' });
    }
    const session = realConnect.call(this, authority, resolved, listener);
    session.brunoSessionKey = sessionKeyFor(normalizedAuthority, proxyKey);
    sessions.add(session);
    // A caller's Host header must become :authority on h2 (virtual-host testing). axios's http2Transport drops
    // ':' headers and never sets :authority, so rewrite here. Installed before axios wraps session.request, so it runs on every stream.
    const originalRequest = session.request;
    session.request = function requestWithAuthority(headers, options) {
      const hostKey = headers && Object.keys(headers).find((k) => k.toLowerCase() === 'host');
      if (hostKey) {
        headers = { ...headers };
        const value = headers[hostKey];
        delete headers[hostKey];
        if (!headers[':authority']) headers[':authority'] = value;
      }
      return originalRequest.call(this, headers, options);
    };
    session.on('error', (err) => {
      // The pending streams are cancelled with this error as their cause, so axios still rejects the
      // request; this listener only stops Node from throwing it at the process.
      session.brunoLastError = err;
    });
    session.once('close', () => sessions.delete(session));
    return session;
  };
};

const closeAllHttp2Sessions = () => {
  for (const session of sessions) {
    if (!session.closed && !session.destroyed) session.close();
  }
  sessions.clear();
};

const getHttp2SessionCount = () => sessions.size;

/** Timeline facts for a response served over an axios-native h2 stream (response.request is the ClientHttp2Stream). */
const describeHttp2Stream = (stream) => {
  const socket = stream && stream.session && stream.session.socket;
  if (!socket) return null;
  const cipher = typeof socket.getCipher === 'function' ? socket.getCipher() : null;
  // nghttp2 lowercases names on the wire; stream.sentHeaders keeps axios's casing. Pseudo-headers
  // (:method, :path, :authority, :scheme) are the h2 request line, reported separately.
  const sentHeaders = {};
  const pseudoHeaders = {};
  for (const [name, value] of Object.entries(stream.sentHeaders || {})) {
    if (name.startsWith(':')) pseudoHeaders[name] = value;
    else sentHeaders[name.toLowerCase()] = value;
  }
  const order = [':method', ':path', ':authority', ':scheme'];
  const requestLine = order.filter((k) => k in pseudoHeaders).map((k) => `${k} ${pseudoHeaders[k]}`).join(' \u00b7 ');
  // Same server-certificate block the h1 TimelineAgent prints, so the h2 timeline is a superset of h1's.
  const peer = typeof socket.getPeerCertificate === 'function' ? socket.getPeerCertificate() : null;
  const fmt = (o) => (o ? Object.entries(o).map(([k, v]) => `${k}=${v}`).join(', ') : null);
  const certificateLines = peer && peer.subject
    ? [
        'Server certificate:',
        ` subject: ${fmt(peer.subject)}`,
        ` start date: ${peer.valid_from}`,
        ` expire date: ${peer.valid_to}`,
        ...(peer.subjectaltname ? [` subjectAltName: ${peer.subjectaltname}`] : []),
        ` issuer: ${fmt(peer.issuer)}`,
        socket.authorized
          ? 'SSL certificate verify ok.'
          : `SSL certificate verification skipped or failed (${socket.authorizationError || 'rejectUnauthorized: false'}).`
      ]
    : [];
  return {
    alpn: socket.alpnProtocol || null,
    protocol: typeof socket.getProtocol === 'function' ? socket.getProtocol() : null,
    cipher: cipher ? cipher.name : null,
    remote: `${socket.remoteAddress}:${socket.remotePort}`,
    sentHeaders,
    pseudoHeaders,
    requestLine,
    certificateLines
  };
};

/**
 * Change 4: decide HTTP/2 for a proxied request. Reuse a live session for this authority+proxy when there is one;
 * otherwise tunnel through Bruno's proxy agent (change 2), offering ALPN by mode, and keep the socket for
 * http2.connect (change 3). Returns { httpVersion, reason } like resolveHttpVersion. In `auto` a tunnel failure or
 * an h1-only server falls back to HTTP/1.1 (the request then uses the same agent as today); in `http2` the tunnel
 * error becomes the request error.
 */
const resolveProxiedHttpVersion = async ({ config, mode, tlsOptions, proxyKey }) => {
  const parsed = new URL(config.url);
  const port = Number(parsed.port) || 443;
  const authority = `https://${parsed.hostname}:${port}`; // must match what axios passes to http2.connect
  if (hasLiveSession(authority, proxyKey)) {
    return { httpVersion: 2, reason: `proxied session reuse via ${proxyKey}` };
  }
  const alpnProtocols = mode === 'auto' ? ['h2', 'http/1.1'] : ['h2'];
  let tunnel;
  try {
    tunnel = await connectThroughProxy({ agent: config.httpsAgent, hostname: parsed.hostname, port, tlsOptions, alpnProtocols });
  } catch (err) {
    if (mode === 'http2') throw err;
    return { httpVersion: 1, reason: `proxy tunnel via ${proxyKey} failed (${err.message}); using HTTP/1.1` };
  }
  if (tunnel.alpn !== 'h2') {
    tunnel.socket.destroy();
    return { httpVersion: 1, reason: `proxy tunnel via ${proxyKey}: server chose ${tunnel.alpn || 'none'}; using HTTP/1.1` };
  }
  offerConnection(authority, proxyKey, tunnel.socket);
  return { httpVersion: 2, reason: `proxy tunnel via ${proxyKey}: server chose h2 (${tunnel.protocol})` };
};

/**
 * bru.sendRequest goes through @usebruno/requests' own axios instance, not the desktop interceptor. This preparer
 * gives scripted requests the same HTTP/2 treatment: resolve the version, build http2Options from the agent the
 * script path already created, then the same header fixes. TLS fields are read off the agent (already run through
 * applySecureContext, so `secureContext` stands in for ca/cert/key).
 */
const createScriptedRequestPreparer = ({ getHttpVersionMode, resolveHttpVersion }) => async (config) => {
  const mode = getHttpVersionMode();
  if (mode !== 'http2' && mode !== 'auto') return;
  installHttp2NativePatch();
  const agentOptions = (config.httpsAgent && config.httpsAgent.options) || {};
  const tlsOptions = {};
  for (const key of ['ca', 'cert', 'key', 'pfx', 'passphrase', 'secureContext', 'rejectUnauthorized', 'minVersion']) {
    if (agentOptions[key] !== undefined) tlsOptions[key] = agentOptions[key];
  }
  const proxyKey = proxyKeyFor(config.httpsAgent);
  const resolved = proxyKey && /^https:/i.test(config.url || '')
    ? await resolveProxiedHttpVersion({ config, mode, tlsOptions, proxyKey })
    : await resolveHttpVersion({ url: config.url, mode, tlsOptions, lookup: config.lookup, proxyUri: proxyKey });
  if (resolved.httpVersion !== 2) {
    delete config.httpVersion;
    delete config.http2Options;
    return;
  }
  config.httpVersion = 2;
  // Through a proxy the tunnel is already connected and DNS is the proxy's job: no lookup in the pool key.
  config.http2Options = buildHttp2Options(tlsOptions, proxyKey ? undefined : config.lookup, proxyKey);
  applyBasicAuthHeader(config);
  stripConnectionHeaders(config.headers);
};

module.exports = {
  resolveProxiedHttpVersion,
  createScriptedRequestPreparer,
  offerConnection,
  hasLiveSession,
  PROXY_OPTION,
  installHttp2NativePatch,
  stripConnectionHeaders,
  applyBasicAuthHeader,
  CONNECTION_HEADERS,
  buildHttp2Options,
  closeAllHttp2Sessions,
  getHttp2SessionCount,
  describeHttp2Stream
};
