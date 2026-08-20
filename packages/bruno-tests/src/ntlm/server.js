const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');

const { type2Message, messageType, provesPassword, randomChallenge } = require('./messages');
const { generateSelfSignedCert } = require('./certificates');

const CLIENT_CERT_NAME = 'bruno-ntlm-client';

const readBody = (req) =>
  new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
  });

/**
 * Authentication is bound to the connection, the way IIS does it, so a handshake split across
 * sockets fails here instead of passing quietly. Every leg is recorded to make that reuse
 * observable, and `/redirect?to=<url>` takes its target from the request so no test configures it.
 */
const handleRequest = ({ password, legs }) => async (req, res) => {
  const body = await readBody(req);
  const authorization = req.headers.authorization;
  const [pathname, query] = req.url.split('?');

  legs.push({
    socketId: req.socket.ntlmSocketId,
    type: messageType(authorization),
    url: req.url,
    body,
    cookie: req.headers.cookie,
    clientCertName: req.socket.getPeerCertificate?.()?.subject?.CN
  });

  const challengeWith = (header) => {
    res.writeHead(401, { 'www-authenticate': header, 'content-length': 0 });
    return res.end();
  };

  switch (messageType(authorization)) {
    case 1: {
      const nonce = randomChallenge();
      req.socket.ntlmChallenge = nonce;
      return challengeWith(type2Message(nonce));
    }
    case 3: {
      const nonce = req.socket.ntlmChallenge;

      if (!nonce || !provesPassword(authorization, password, nonce)) {
        return challengeWith('Negotiate, NTLM');
      }
      if (pathname === '/redirect') {
        res.writeHead(302, { 'location': new URLSearchParams(query).get('to'), 'content-length': 0 });
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ authenticated: true, url: pathname }));
    }
    default:
      return challengeWith('NTLM');
  }
};

const createCertificates = (requireClientCert) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-ntlm-tls-'));

  return {
    dir,
    server: generateSelfSignedCert(dir, 'server', 'localhost'),
    client: requireClientCert ? generateSelfSignedCert(dir, 'client', CLIENT_CERT_NAME) : null
  };
};

const tlsOptionsFor = ({ server, client }) => ({
  key: fs.readFileSync(server.keyPath),
  cert: fs.readFileSync(server.certPath),
  ...(client ? { requestCert: true, rejectUnauthorized: true, ca: [fs.readFileSync(client.certPath)] } : {})
});

const startNtlmServer = async ({ tls = false, password = 'pass', requireClientCert = false } = {}) => {
  const legs = [];
  const sockets = [];
  const handler = handleRequest({ password, legs });

  const certificates = tls ? createCertificates(requireClientCert) : null;
  const listener = certificates
    ? https.createServer(tlsOptionsFor(certificates), handler)
    : http.createServer(handler);

  let socketId = 0;
  listener.on('connection', (socket) => {
    socket.ntlmSocketId = ++socketId;
    sockets.push(socket);
  });

  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const { port } = listener.address();
  const scheme = tls ? 'https' : 'http';

  return {
    baseUrl: `${scheme}://127.0.0.1:${port}`,
    urlFor: (hostname) => `${scheme}://${hostname}:${port}`,
    legs,
    certPath: certificates?.server.certPath,
    clientCertPath: certificates?.client?.certPath,
    clientKeyPath: certificates?.client?.keyPath,
    clientCertName: CLIENT_CERT_NAME,
    messageTypesSeen: () => legs.map((leg) => leg.type),
    negotiations: () => legs.filter((leg) => leg.type === 1),
    connectionsUsed: () => new Set(legs.map((leg) => leg.socketId)).size,
    close: async () => {
      sockets.forEach((socket) => socket.destroy());
      await new Promise((resolve) => listener.close(resolve));
      if (certificates) {
        fs.rmSync(certificates.dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      }
    }
  };
};

module.exports = { startNtlmServer };
