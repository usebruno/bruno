const { URL } = require('url');
const {
  createHttp2Transport,
  closeAllSessions,
  getSessionCount,
  negotiateHttpVersion,
  canUseHttp2
} = require('@usebruno/requests');
const { proxyKeyFor, connectThroughProxy } = require('./http2-proxy');

const HTTP2_ALPN_PROTOCOLS = ['h2'];
const AUTO_ALPN_PROTOCOLS = ['h2', 'http/1.1'];

/**
 * Convert Basic Auth credentials into an Authorization header.
 *
 * Axios normally handles this through Node's HTTP/1.1 request,
 * but our HTTP/2 transport needs the header to be set explicitly.
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
      const url = new URL(config.url);

      if (url.username || url.password) {
        username = decodeURIComponent(url.username);
        password = decodeURIComponent(url.password);

        url.username = '';
        url.password = '';
        config.url = url.toString();
      }
    } catch {
      return false;
    }
  }

  if (username === undefined) return false;

  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  const authorization = `Basic ${credentials}`;

  if (typeof config.headers?.set === 'function') {
    config.headers.set('Authorization', authorization);
  } else {
    config.headers = {
      ...config.headers,
      Authorization: authorization
    };
  }

  delete config.auth;

  return true;
};

/**
 * Collect HTTP/2 request and TLS details for the timeline.
 */
const describeHttp2Stream = (stream) => {
  const socket = stream?.session?.socket;
  if (!socket) return null;

  const cipher = socket.getCipher?.() || null;
  const certificate = socket.getPeerCertificate?.() || null;

  const sentHeaders = {};
  const pseudoHeaders = {};

  for (const [name, value] of Object.entries(stream.sentHeaders || {})) {
    if (name.startsWith(':')) {
      pseudoHeaders[name] = value;
    } else {
      sentHeaders[name.toLowerCase()] = value;
    }
  }

  const requestLine = [':method', ':path', ':authority', ':scheme']
    .filter((name) => name in pseudoHeaders)
    .map((name) => `${name} ${pseudoHeaders[name]}`)
    .join(' · ');

  const formatCertificateFields = (fields) =>
    fields
      ? Object.entries(fields)
          .map(([key, value]) => `${key}=${value}`)
          .join(', ')
      : null;

  const certificateLines = certificate?.subject
    ? [
        'Server certificate:',
        ` subject: ${formatCertificateFields(certificate.subject)}`,
        ` start date: ${certificate.valid_from}`,
        ` expire date: ${certificate.valid_to}`,
        ...(certificate.subjectaltname
          ? [` subjectAltName: ${certificate.subjectaltname}`]
          : []),
        ` issuer: ${formatCertificateFields(certificate.issuer)}`,
        socket.authorized
          ? 'SSL certificate verify ok.'
          : `SSL certificate verification skipped or failed (${socket.authorizationError || 'rejectUnauthorized: false'}).`
      ]
    : [];

  return {
    alpn: socket.alpnProtocol || null,
    protocol: socket.getProtocol?.() || null,
    cipher: cipher?.name || null,
    remote: `${socket.remoteAddress}:${socket.remotePort}`,
    sentHeaders,
    pseudoHeaders,
    requestLine,
    certificateLines
  };
};

/**
 * Negotiate HTTP/2 through a proxy tunnel.
 *
 * Reuse the connected socket if the server selects HTTP/2.
 * Otherwise, close it and let axios use HTTP/1.1.
 */
const negotiateHttp2ThroughProxy = async ({
  config,
  mode,
  agentOptions,
  proxyKey
}) => {
  const url = new URL(config.url);
  const port = Number(url.port) || 443;

  const offered = mode === 'auto'
    ? AUTO_ALPN_PROTOCOLS
    : HTTP2_ALPN_PROTOCOLS;

  try {
    const tunnel = await connectThroughProxy({
      agent: config.httpsAgent,
      hostname: url.hostname,
      port,
      tlsOptions: agentOptions,
      alpnProtocols: offered
    });

    const alpn = tunnel.alpn || null;

    if (alpn === 'h2') {
      return {
        httpVersion: 2,
        reason: `proxy tunnel via ${proxyKey}: server chose h2 (${tunnel.protocol})`,
        offered,
        alpn,
        socket: tunnel.socket
      };
    }

    tunnel.socket.destroy();

    return {
      httpVersion: 1,
      reason: `proxy tunnel via ${proxyKey}: server chose ${alpn || 'none'}; using HTTP/1.1`,
      offered,
      alpn,
      socket: null
    };
  } catch (error) {
    if (mode === 'http2') throw error;

    return {
      httpVersion: 1,
      reason: `proxy tunnel via ${proxyKey} failed (${error.message}); using HTTP/1.1`,
      offered,
      alpn: null,
      socket: null
    };
  }
};

/**
 * Select the HTTP version for a direct or proxied connection.
 */
const selectHttpVersion = async ({
  config,
  mode,
  agentOptions,
  proxyKey
}) => {
  const isProxiedHttps
    = proxyKey && /^https:/i.test(config.url || '');

  if (isProxiedHttps) {
    return negotiateHttp2ThroughProxy({
      config,
      mode,
      agentOptions,
      proxyKey
    });
  }

  const decision = await negotiateHttpVersion({
    url: config.url,
    mode,
    tlsOptions: agentOptions,
    lookup: config.lookup,
    proxyUri: proxyKey
  });

  return {
    ...decision,
    socket: null
  };
};

/**
 * Add protocol negotiation and selection details to the timeline.
 */
const logHttpVersionDecision = (timeline, decision) => {
  const { httpVersion, reason, offered, alpn } = decision;

  if (offered?.length) {
    timeline.push({
      timestamp: new Date(),
      type: 'tls',
      message: `ALPN: offered ${offered.join(', ')} · server accepted ${alpn || 'none'}`
    });
  }

  timeline.push({
    timestamp: new Date(),
    type: 'info',
    message: `HTTP/${httpVersion === 2 ? '2' : '1.1'} selected (${reason})`
  });
};

/**
 * Select the HTTP version and attach our custom transport when HTTP/2 is supported.
 *
 * Direct connections use ALPN negotiation. Proxied connections negotiate
 * through a CONNECT tunnel and reuse the connected socket.
 */
const applyHttp2Transport = async ({
  config,
  mode,
  agentOptions,
  timeline
}) => {
  // A redirect may reuse the config from an earlier HTTP/2 request.
  delete config.transport;

  if (!canUseHttp2(mode)) return;

  const proxyKey = proxyKeyFor(config.httpsAgent);

  const decision = await selectHttpVersion({
    config,
    mode,
    agentOptions,
    proxyKey
  });

  logHttpVersionDecision(timeline, decision);

  if (decision.httpVersion !== 2) return;

  config.transport = createHttp2Transport({
    tlsOptions: agentOptions,
    mode: 'http2',
    lookup: proxyKey ? undefined : config.lookup,
    proxyUri: proxyKey,
    socket: decision.socket,
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
 * Apply the same HTTP/2 setup to scripted requests.
 *
 * Scripted requests use a separate axios instance and don't have
 * a request timeline.
 */
const createScriptedRequestPreparer
  = ({ getHttpVersionMode }) =>
    async (config) => {
      const mode = getHttpVersionMode();

      if (!canUseHttp2(mode)) {
        delete config.transport;
        return;
      }

      const agentOptions = config.httpsAgent?.options || {};

      await applyHttp2Transport({
        config,
        mode,
        agentOptions,
        timeline: []
      });
    };

module.exports = {
  applyHttp2Transport,
  createScriptedRequestPreparer,
  applyBasicAuthHeader,
  describeHttp2Stream,
  closeAllHttp2Sessions: closeAllSessions,
  getHttp2SessionCount: getSessionCount
};
