#!/usr/bin/env node

/**
 * mTLS test servers — every endpoint REQUIRES a valid client certificate.
 *
 *   HTTPS + WSS : https://localhost:9443   (wss://localhost:9443/ws)
 *   gRPC (TLS)  : grpcs://localhost:9444    service hello.HelloService/SayHello
 *
 * Run `node scripts/generate-certs.js` first. Each server is configured with
 * requestCert + rejectUnauthorized so a request WITHOUT a client cert is rejected
 * at the TLS layer — which is exactly what proves Bruno did (or did not) attach one.
 */

const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const WebSocket = require('ws');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { killProcessOnPort } = require('./helpers/platform');

const CERTS_DIR = path.join(__dirname, 'certs');
const HTTPS_PORT = 9443;
const GRPC_PORT = 9444;
const PROTO_PATH = path.join(__dirname, 'hello.proto');

const read = (file) => fs.readFileSync(path.join(CERTS_DIR, file));

// ---- describe the client cert the peer presented, for easy visual confirmation ----
const peerInfo = (socket) => {
  const cert = socket.getPeerCertificate && socket.getPeerCertificate();
  if (!cert || !Object.keys(cert).length) return { clientCertPresented: false };
  return { clientCertPresented: true, subjectCN: cert.subject?.CN, issuerCN: cert.issuer?.CN };
};

// =====================  HTTPS + WSS  =====================
function createHttpsServer(certsDir, port) {
  const serverOptions = {
    key: fs.readFileSync(path.join(certsDir, 'server-key.pem')),
    cert: fs.readFileSync(path.join(certsDir, 'server-cert.pem')),
    ca: fs.readFileSync(path.join(certsDir, 'ca-cert.pem')),
    requestCert: true,
    rejectUnauthorized: true
  };

  const server = https.createServer(serverOptions, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, protocol: 'https', ...peerInfo(req.socket) }));
  });

  // Create WebSocket server for WSS (mTLS) support
  const wss = new WebSocket.Server({ noServer: true });
  wss.on('connection', (ws, request) => {
    ws.on('error', (err) => console.error('WebSocket error:', err.message));
    // reply to any message with the peer-cert info, so clients can verify the cert was attached
    ws.on('message', (data) => {
      ws.send(JSON.stringify({ ...peerInfo(request.socket), echo: Buffer.from(data).toString() }));
    });
  });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (request, socket, head) => {
    if (request.url.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
    } else {
      socket.destroy();
    }
  });

  // surface TLS handshake rejections (missing/invalid client cert) in the console
  server.on('tlsClientError', (err) => console.log('🔒 HTTPS/WSS rejected TLS client:', err.message));

  return new Promise((resolve, reject) => {
    server.listen(port, (error) => {
      if (error) reject(error);
      else resolve(server);
    });
  });
}

// =====================  gRPC (TLS, client cert required)  =====================
function createGrpcServer(certsDir, port) {
  const pkgDef = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
  const proto = grpc.loadPackageDefinition(pkgDef).hello;

  const server = new grpc.Server();
  server.addService(proto.HelloService.service, {
    SayHello: (call, callback) => {
      callback(null, { reply: `hello ${call.request.greeting || 'there'} (mTLS ok)` });
    }
  });

  // checkClientCertificate = true → client cert is REQUIRED and verified against `ca`
  const creds = grpc.ServerCredentials.createSsl(
    read('ca-cert.pem'),
    [{ private_key: read('server-key.pem'), cert_chain: read('server-cert.pem') }],
    true
  );

  return new Promise((resolve, reject) => {
    server.bindAsync(`0.0.0.0:${port}`, creds, (err) => {
      if (err) reject(err);
      else resolve(server);
    });
  });
}

function shutdownServer(httpsServer, grpcServer) {
  const shutdown = (signal) => {
    console.log(`🛑 Received ${signal}, shutting down`);
    try { httpsServer && httpsServer.close(); } catch {}
    try { grpcServer && grpcServer.forceShutdown(); } catch {}
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function startServer() {
  console.log('🚀 Starting mTLS test servers (client certificate required)');

  try {
    killProcessOnPort(HTTPS_PORT);
    killProcessOnPort(GRPC_PORT);

    console.log(`🌐 Creating HTTPS + WSS server on port ${HTTPS_PORT}`);
    const httpsServer = await createHttpsServer(CERTS_DIR, HTTPS_PORT);
    console.log(`🌐 HTTPS + WSS (mTLS) on https://localhost:${HTTPS_PORT}  (ws path: /ws)`);

    console.log(`🌐 Creating gRPC server on port ${GRPC_PORT}`);
    const grpcServer = await createGrpcServer(CERTS_DIR, GRPC_PORT);
    console.log(`🌐 gRPC (mTLS) on grpcs://localhost:${GRPC_PORT}  (hello.HelloService/SayHello)`);

    shutdownServer(httpsServer, grpcServer);

    return { httpsServer, grpcServer };
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
