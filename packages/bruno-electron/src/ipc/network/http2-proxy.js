const { EventEmitter } = require('events');
const { applySecureContext } = require('@usebruno/requests');

const TUNNEL_TIMEOUT_MS = 10_000;

const isProxyAgent = (agent) =>
  Boolean(agent && typeof agent.connect === 'function' && agent.proxy);

const proxyKeyFor = (agent) => {
  if (!isProxyAgent(agent)) return null;

  const proxy = agent.proxy;

  if (typeof proxy.href === 'string') {
    return proxy.href;
  }

  return `socks${proxy.type || ''}://${proxy.host}:${proxy.port}`;
};

/**
 * Build TLS options for connecting to the origin through a proxy.
 */
const buildProxyTlsOptions = ({ hostname, port, tlsOptions, alpnProtocols }) => {
  // Remove agent-specific options that shouldn't reach the TLS connection.
  const { keepAlive, proxy, caCertificatesCount, lookup, ...tlsFields } = tlsOptions;

  const options = {
    ...applySecureContext({ ...tlsFields }),
    host: hostname,
    port,
    servername: hostname,
    secureEndpoint: true,
    rejectUnauthorized: tlsFields.rejectUnauthorized !== false
  };

  if (alpnProtocols) {
    options.ALPNProtocols = alpnProtocols;
  }

  return options;
};

/**
 * Open a TLS connection to the origin through the configured proxy.
 *
 * The proxy agent creates the tunnel, and we wait for the TLS handshake
 * to finish before returning the socket and negotiated ALPN protocol.
 */
const connectThroughProxy = ({
  agent,
  hostname,
  port,
  tlsOptions = {},
  alpnProtocols,
  timeoutMs = TUNNEL_TIMEOUT_MS
}) =>
  new Promise((resolve, reject) => {
    const request = new EventEmitter();
    const options = buildProxyTlsOptions({
      hostname,
      port,
      tlsOptions,
      alpnProtocols
    });

    let proxyStatus;
    let socket = null;
    let settled = false;

    request.on('proxyConnect', (response) => {
      proxyStatus = response?.statusCode;
    });

    const fail = (error) => {
      if (settled) return;

      settled = true;
      clearTimeout(timer);
      socket?.destroy();

      reject(error);
    };

    // Prevent stalled proxy connections or TLS handshakes from hanging.
    const timer = setTimeout(() => {
      const error = new Error(`proxy tunnel timed out after ${timeoutMs} ms`);
      error.code = 'ETIMEDOUT';
      fail(error);
    }, timeoutMs);

    const complete = () => {
      if (settled) return;

      settled = true;
      clearTimeout(timer);
      socket.removeListener('error', fail);

      resolve({
        socket,
        alpn: socket.alpnProtocol || null,
        protocol: socket.getProtocol(),
        proxyStatus
      });
    };

    const handleSocket = (connectedSocket) => {
      socket = connectedSocket;

      // A refused CONNECT may return a fake socket instead of throwing.
      if (!socket?.encrypted) {
        const error = new Error(
          `proxy CONNECT refused (${proxyStatus || 'no status'})`
        );

        error.code = 'EPROXYREFUSED';
        error.proxyStatus = proxyStatus;

        fail(error);
        return;
      }

      socket.once('error', fail);

      // ALPN is available only after the TLS handshake completes.
      if (socket.alpnProtocol || socket.authorized || socket.authorizationError) {
        complete();
      } else {
        socket.once('secureConnect', complete);
      }
    };

    Promise.resolve()
      .then(() => agent.connect(request, options))
      .then(handleSocket)
      .catch(fail);
  });

module.exports = {
  isProxyAgent,
  proxyKeyFor,
  connectThroughProxy
};
