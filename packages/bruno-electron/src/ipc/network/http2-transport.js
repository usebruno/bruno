/**
 * HTTP/2 for Bruno via our own transport (POC, custom-transport branch).
 *
 * The version is decided before the request (http2-resolver / a proxy tunnel), and when it is h2
 * we hand axios `config.transport` — @usebruno/requests' createHttp2Transport, backed by our own
 * session pool. axios honours config.transport only when httpVersion is unset, so this path never
 * sets config.httpVersion. No monkey-patch of http2.connect: the pool owns session lifecycle,
 * error handling, GOAWAY and reuse; headers.ts owns :authority / connection-header stripping.
 */
const { URL } = require('url');
const {
  createHttp2Transport,
  closeAllSessions,
  getSessionCount
} = require('@usebruno/requests');
const { resolveHttpVersion } = require('./http2-resolver');
const { proxyKeyFor, connectThroughProxy } = require('./http2-proxy');

/**
 * axios turns config.auth (or user:pass@ in the URL) into options.auth and deletes any Authorization
 * header, relying on Node's http.ClientRequest to write it; our h2 transport never sees options.auth.
 * Build the header here and remove both inputs so axios leaves it alone. Returns true when applied.
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

/** Timeline facts for a response served over an h2 stream (response.request is the ClientHttp2Stream). */
const describeHttp2Stream = (stream) => {
  const socket = stream && stream.session && stream.session.socket;
  if (!socket) return null;
  const cipher = typeof socket.getCipher === 'function' ? socket.getCipher() : null;
  const sentHeaders = {};
  const pseudoHeaders = {};
  for (const [name, value] of Object.entries(stream.sentHeaders || {})) {
    if (name.startsWith(':')) pseudoHeaders[name] = value;
    else sentHeaders[name.toLowerCase()] = value;
  }
  const order = [':method', ':path', ':authority', ':scheme'];
  const requestLine = order.filter((k) => k in pseudoHeaders).map((k) => `${k} ${pseudoHeaders[k]}`).join(' · ');
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
 * Decide the HTTP version and, if h2, attach our transport to the axios config. Called from the request
 * interceptor after setupProxyAgents (so config.httpsAgent is the final direct/proxy agent).
 *   - direct: http2-resolver probes ALPN (auto) or trusts the mode.
 *   - proxied: open the CONNECT tunnel; its ALPN is the answer, and the socket seeds the pool.
 * On h2 it also builds the Basic-auth header (auth option / URL creds are dropped otherwise).
 */
const applyHttp2Transport = async ({ config, mode, agentOptions, timeline }) => {
  if (mode !== 'http2' && mode !== 'auto') return;

  const proxyKey = proxyKeyFor(config.httpsAgent);
  let httpVersion = 1;
  let reason = '';
  let tunnelSocket = null;
  let alpnOffered = null; // protocols we offered during negotiation (auto/proxy probe)
  let alpnAccepted = null; // what the server picked

  if (proxyKey && /^https:/i.test(config.url || '')) {
    // Proxied: the tunnel doubles as the ALPN probe; keep the socket for the first session.
    const parsed = new URL(config.url);
    const port = Number(parsed.port) || 443;
    const alpnProtocols = mode === 'auto' ? ['h2', 'http/1.1'] : ['h2'];
    alpnOffered = alpnProtocols;
    try {
      const tunnel = await connectThroughProxy({
        agent: config.httpsAgent,
        hostname: parsed.hostname,
        port,
        tlsOptions: agentOptions,
        alpnProtocols
      });
      alpnAccepted = tunnel.alpn || null;
      if (tunnel.alpn === 'h2') {
        httpVersion = 2;
        tunnelSocket = tunnel.socket;
        reason = `proxy tunnel via ${proxyKey}: server chose h2 (${tunnel.protocol})`;
      } else {
        tunnel.socket.destroy();
        reason = `proxy tunnel via ${proxyKey}: server chose ${tunnel.alpn || 'none'}; using HTTP/1.1`;
      }
    } catch (err) {
      if (mode === 'http2') throw err;
      reason = `proxy tunnel via ${proxyKey} failed (${err.message}); using HTTP/1.1`;
    }
  } else {
    const resolved = await resolveHttpVersion({
      url: config.url,
      mode,
      tlsOptions: agentOptions,
      lookup: config.lookup,
      proxyUri: proxyKey
    });
    httpVersion = resolved.httpVersion;
    reason = resolved.reason;
    alpnOffered = resolved.offered || null;
    alpnAccepted = resolved.alpn || null;
  }

  if (alpnOffered && alpnOffered.length > 0) {
    timeline.push({
      timestamp: new Date(),
      type: 'tls',
      message: `ALPN: offered ${alpnOffered.join(', ')} · server accepted ${alpnAccepted || 'none'}`
    });
  }
  timeline.push({
    timestamp: new Date(),
    type: 'info',
    message: `HTTP/${httpVersion === 2 ? '2' : '1.1'} selected (${reason})`
  });

  // The redirect loop reuses this config for the next hop, so an h1 decision must undo an earlier
  // hop's h2 transport — otherwise a h2 -> h1-only redirect keeps the h2 transport and fails ALPN.
  if (httpVersion !== 2) {
    delete config.transport;
    return;
  }

  // Through a proxy the tunnel is connected and DNS is the proxy's job: no lookup on the pool side.
  config.transport = createHttp2Transport({
    tlsOptions: agentOptions,
    mode: 'http2',
    lookup: proxyKey ? undefined : config.lookup,
    proxyUri: proxyKey,
    socket: tunnelSocket,
    timeline
  });

  if (applyBasicAuthHeader(config)) {
    timeline.push({
      timestamp: new Date(),
      type: 'info',
      message: 'HTTP/2: Authorization header built from auth option / URL credentials (axios drops these on h2)'
    });
  }
};

/**
 * bru.sendRequest uses @usebruno/requests' own axios instance, not the desktop interceptor. This preparer
 * gives scripted requests the same treatment: resolve the version and, if h2, attach our transport. TLS
 * fields come off the agent the script path already built (already run through applySecureContext).
 */
const createScriptedRequestPreparer = ({ getHttpVersionMode }) => async (config) => {
  const mode = getHttpVersionMode();
  if (mode !== 'http2' && mode !== 'auto') return;
  const agentOptions = (config.httpsAgent && config.httpsAgent.options) || {};
  // Scripted requests have no timeline; give applyHttp2Transport a scratch sink.
  await applyHttp2Transport({ config, mode, agentOptions, timeline: [] });
};

module.exports = {
  applyHttp2Transport,
  createScriptedRequestPreparer,
  applyBasicAuthHeader,
  describeHttp2Stream,
  closeAllHttp2Sessions: closeAllSessions,
  getHttp2SessionCount: getSessionCount
};
