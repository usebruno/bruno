const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { ReflectionService } = require('@grpc/reflection');

const PROTO_PATH = path.join(__dirname, 'echo.proto');
const CERTS_DIR = path.join(__dirname, 'certs');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const echoService = proto.bruno.tests.echo.EchoService.service;

// Mirror request metadata back to the caller as initial metadata so clients
// can assert on what the server saw. Non-binary values only; `-bin` metadata
// is dropped because we can't safely stringify it here.
const buildEchoMetadata = (call) => {
  const meta = new grpc.Metadata();
  const map = call.metadata.getMap();
  for (const [key, value] of Object.entries(map)) {
    if (key.endsWith('-bin')) continue;
    meta.add(`grpc-echo-${key}`, String(value));
  }
  return meta;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const handlers = {
  Ping(_call, callback) {
    callback(null, { message: 'pong' });
  },

  async Echo(call, callback) {
    const { message = '', delayMs = 0 } = call.request || {};
    call.sendMetadata(buildEchoMetadata(call));
    if (delayMs > 0) await delay(delayMs);
    callback(null, { message, index: 0 });
  },

  async EchoStream(call) {
    const { message = '', count = 1, intervalMs = 0 } = call.request || {};
    call.sendMetadata(buildEchoMetadata(call));
    for (let i = 0; i < count; i++) {
      if (call.cancelled) return;
      call.write({ message, index: i });
      if (intervalMs > 0 && i < count - 1) await delay(intervalMs);
    }
    call.end();
  },

  Collect(call, callback) {
    let count = 0;
    const parts = [];
    call.sendMetadata(buildEchoMetadata(call));
    call.on('data', (msg) => {
      count += 1;
      if (msg && typeof msg.message === 'string') parts.push(msg.message);
    });
    call.on('end', () => {
      callback(null, { count, concatenated: parts.join('') });
    });
    call.on('error', (err) => {
      console.error('Collect stream error', err);
    });
  },

  Chat(call) {
    call.sendMetadata(buildEchoMetadata(call));
    let index = 0;
    call.on('data', (msg) => {
      const message = msg && typeof msg.message === 'string' ? msg.message : '';
      call.write({ message, index: index++ });
    });
    call.on('end', () => call.end());
    call.on('error', (err) => {
      console.error('Chat stream error', err);
    });
  },

  ThrowError(call, callback) {
    const { code = grpc.status.UNKNOWN, message = 'requested error' } = call.request || {};
    callback({ code, message, metadata: buildEchoMetadata(call) });
  }
};

const readCert = (name) => fs.readFileSync(path.join(CERTS_DIR, name));

// TLS creds — server presents its cert, does not verify client.
const buildTlsCredentials = () => {
  const serverKey = readCert('server.key');
  const serverCert = readCert('server.crt');
  return grpc.ServerCredentials.createSsl(null, [{ private_key: serverKey, cert_chain: serverCert }], false);
};

// mTLS creds — server presents its cert AND requires a client cert signed by
// the test CA. The final `true` toggles client-cert verification on.
const buildMtlsCredentials = () => {
  const caCert = readCert('ca.crt');
  const serverKey = readCert('server.key');
  const serverCert = readCert('server.crt');
  return grpc.ServerCredentials.createSsl(caCert, [{ private_key: serverKey, cert_chain: serverCert }], true);
};

const bind = (server, address, credentials, label) =>
  new Promise((resolve, reject) => {
    server.bindAsync(address, credentials, (err, boundPort) => {
      if (err) return reject(err);
      console.log(`gRPC testbench (${label}) started on port: ${boundPort}`);
      resolve(boundPort);
    });
  });

const start = async () => {
  const insecurePort = process.env.GRPC_PORT || 50051;
  const tlsPort = process.env.GRPC_TLS_PORT || 50052;
  const mtlsPort = process.env.GRPC_MTLS_PORT || 50053;

  const server = new grpc.Server();
  server.addService(echoService, handlers);

  // Register reflection so Bruno's reflection-based method discovery works
  // against this server without needing the proto file client-side.
  const reflection = new ReflectionService(packageDefinition);
  reflection.addToServer(server);

  try {
    await bind(server, `0.0.0.0:${insecurePort}`, grpc.ServerCredentials.createInsecure(), 'insecure');
    await bind(server, `0.0.0.0:${tlsPort}`, buildTlsCredentials(), 'tls');
    await bind(server, `0.0.0.0:${mtlsPort}`, buildMtlsCredentials(), 'mtls');
  } catch (err) {
    console.error('Failed to bind gRPC server', err);
    process.exit(1);
  }

  return server;
};

if (require.main === module) {
  start();
}

module.exports = { start };
