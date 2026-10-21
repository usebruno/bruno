const { URL } = require('url');
const {
  createHttp2Transport,
  closeAllSessions,
  getSessionCount,
  negotiateHttpVersion,
  canUseHttp2,
  hasLiveSession
} = require('@usebruno/requests');
const { proxyKeyFor, redactProxyUri, connectThroughProxy } = require('@usebruno/requests');

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
const getHttp2RequestDetails = (stream) => {
  const socket = stream?.session?.socket;
  if (!socket) return null;

  // Sent headers come off the stream, not the socket, so they're safe even after the session closes.
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

  let alpn = null;
  let protocol = null;
  let cipherName = null;
  let remote = null;
  let certificateLines = [];

  try {
    alpn = socket.alpnProtocol || null;
    protocol = socket.getProtocol?.() || null;
    cipherName = socket.getCipher?.()?.name || null;
    remote = socket.remoteAddress ? `${socket.remoteAddress}:${socket.remotePort}` : null;

    const certificate = socket.getPeerCertificate?.() || null;
    const certificateLines = [];

    if (certificate?.subject) {
      certificateLines.push(
        'Server certificate:',
        ` subject: ${formatCertificateFields(certificate.subject)}`,
        ` start date: ${certificate.valid_from}`,
        ` expire date: ${certificate.valid_to}`
      );

      if (certificate.subjectaltname) {
        certificateLines.push(` subjectAltName: ${certificate.subjectaltname}`);
      }

      certificateLines.push(
        ` issuer: ${formatCertificateFields(certificate.issuer)}`,
        socket.authorized
          ? 'SSL certificate verify ok.'
          : `SSL certificate verification skipped or failed (${socket.authorizationError || 'rejectUnauthorized: false'}).`
      );
    }
  } catch {
    // Session already torn down, keep the request-line details we gathered above.
  }

  return {
    alpn,
    protocol,
    cipher: cipherName,
    remote,
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
  const origin = `${url.protocol}//${url.hostname}:${port}`;
  const safeProxy = redactProxyUri(proxyKey);

  const offered = mode === 'auto'
    ? ['h2', 'http/1.1']
    : ['h2'];

  if (hasLiveSession({ origin, tlsOptions: agentOptions, proxyUri: proxyKey })) {
    return {
      httpVersion: 2,
      reason: `reusing pooled HTTP/2 session via ${safeProxy}`,
      offered: undefined,
      alpn: null,
      socket: null
    };
  }

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
        reason: `proxy tunnel via ${safeProxy}: server chose h2 (${tunnel.protocol})`,
        offered,
        alpn,
        socket: tunnel.socket
      };
    }

    tunnel.socket.destroy();

    return {
      httpVersion: 1,
      reason: `proxy tunnel via ${safeProxy}: server chose ${alpn || 'none'}; using HTTP/1.1`,
      offered,
      alpn,
      socket: null
    };
  } catch (error) {
    if (mode === 'http2') throw error;

    return {
      httpVersion: 1,
      reason: `proxy tunnel via ${safeProxy} failed (${error.message}); using HTTP/1.1`,
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

module.exports = {
  applyHttp2Transport,
  applyBasicAuthHeader,
  getHttp2RequestDetails,
  closeAllHttp2Sessions: closeAllSessions,
  getHttp2SessionCount: getSessionCount
};
