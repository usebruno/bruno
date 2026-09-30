/**
 * HTTP/2 through Bruno's proxies (POC) — change 1: identify a proxied request.
 *
 * setupProxyAgents() has already decided the proxy for this request (mode on/system/pac, bypass rules, auth)
 * and expressed it as the agent on config.httpsAgent: a plain https.Agent means direct; an agent-base agent
 * with a .proxy (PatchedHttpsProxyAgent for CONNECT, SocksProxyAgent for SOCKS) means proxied. We key off the
 * agent rather than re-reading preferences so every decision stays Bruno's.
 */

const { EventEmitter } = require('events');
const { applySecureContext } = require('@usebruno/requests');

/** True for the agents Bruno creates for proxied requests; false for a plain https.Agent (direct). */
const isProxyAgent = (agent) => Boolean(agent && typeof agent.connect === 'function' && agent.proxy);

/** Stable string identifying the proxy an agent talks to; becomes part of the HTTP/2 session key. */
const proxyKeyFor = (agent) => {
  if (!isProxyAgent(agent)) return null;
  const p = agent.proxy;
  if (typeof p.href === 'string') return p.href; // http(s) CONNECT proxy: a URL object (credentials included)
  return `socks${p.type || ''}://${p.host}:${p.port}`; // SocksProxyAgent: plain { host, port, type } object
};

const TUNNEL_TIMEOUT_MS = 10 * 1000;

/**
 *
 * On h1 Node's http asks the agent for a socket and agent-base runs agent.connect(req, opts) for it. Node's http2
 * never asks, so we call connect() ourselves. `req` is only used as an event emitter inside connect(), so a bare
 * EventEmitter is enough. With secureEndpoint the agent returns a TLS socket to the origin over the tunnel, using
 * the TLS fields we pass in opts (PatchedHttpsProxyAgent also forwards its constructor's cert/key/secureContext).
 * Resolves { socket, alpn, protocol, proxyStatus }; rejects on proxy refusal, TLS failure or timeout, and never
 * leaves a socket open on failure. The caller decides whether to keep the socket (alpn === 'h2') or destroy it.
 */
const connectThroughProxy = ({ agent, hostname, port, tlsOptions = {}, alpnProtocols, timeoutMs = TUNNEL_TIMEOUT_MS }) =>
  new Promise((resolve, reject) => {
    // Agent-only and non-TLS fields must not reach tls.connect.
    const { keepAlive, proxy, caCertificatesCount, lookup, ...tlsOnly } = tlsOptions;
    const req = new EventEmitter();
    let proxyStatus;
    req.on('proxyConnect', (c) => {
      proxyStatus = c && c.statusCode;
    });
    const opts = {
      ...applySecureContext({ ...tlsOnly }), // ca/cert/key/pfx -> secureContext, default roots kept
      host: hostname,
      port,
      servername: hostname, // SNI names the origin, not the proxy
      secureEndpoint: true, // "wrap the tunnel in TLS to the origin"
      rejectUnauthorized: tlsOnly.rejectUnauthorized !== false
    };
    if (alpnProtocols) opts.ALPNProtocols = alpnProtocols;

    let settled = false;
    let socket = null;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (socket) socket.destroy();
      reject(err);
    };
    const timer = setTimeout(() => fail(Object.assign(new Error(`proxy tunnel timed out after ${timeoutMs} ms`), { code: 'ETIMEDOUT' })), timeoutMs);

    Promise.resolve()
      .then(() => agent.connect(req, opts))
      .then((s) => {
        socket = s;
        // https-proxy-agent does not throw on a refused CONNECT (407/403/...): it returns a fake non-TLS socket
        // so Node's http can replay the error body. For us that is a failure.
        if (!socket || !socket.encrypted) {
          return fail(Object.assign(new Error(`proxy CONNECT refused (${proxyStatus || 'no status'})`), { code: 'EPROXYREFUSED', proxyStatus }));
        }
        const done = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          socket.removeListener('error', fail);
          resolve({ socket, alpn: socket.alpnProtocol || null, protocol: socket.getProtocol(), proxyStatus });
        };
        socket.once('error', fail);
        // connect() resolves when tls.connect() returns, before the handshake; ALPN is known only after it.
        if (socket.alpnProtocol || socket.authorized || socket.authorizationError) done();
        else socket.once('secureConnect', done);
      })
      .catch(fail);
  });

module.exports = { isProxyAgent, proxyKeyFor, connectThroughProxy };
