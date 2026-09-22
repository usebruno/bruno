/**
 * Local gRPC testbench — mirrors the historical grpcb.in HelloService the
 * Playwright fixtures were written against.
 *
 *   50051  insecure  — plaintext (env: GRPC_PORT)
 *
 * Service (see ./hello.proto) — hello.HelloService:
 *   SayHello         unary          → echoes greeting back as reply
 *   LotsOfReplies    server stream  → emits 10 replies
 *   LotsOfGreetings  client stream  → aggregates greetings into one reply
 *   BidiHello        bidi stream    → echoes each incoming greeting
 *
 * Reflection is registered via `@grpc/reflection` so Bruno's reflection-based
 * method discovery works without a client-side proto file.
 *
 * Usage:
 *   node ./src/grpc/index.js                 # standalone
 *   const grpc = require('./grpc');          # imported (see ../index.js)
 *   grpc.start().catch(err => { ... });
 */

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { ReflectionService } = require('@grpc/reflection');

const PROTO_PATH = path.join(__dirname, 'hello.proto');
const STREAM_REPLY_COUNT = 10;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const helloService = proto.hello.HelloService.service;

const buildReply = (greeting, suffix = '') =>
  ({ reply: `hello ${greeting || 'world'}${suffix}` });

const handlers = {
  SayHello(call, callback) {
    const greeting = call.request && call.request.greeting;
    callback(null, buildReply(greeting));
  },

  LotsOfReplies(call) {
    const greeting = call.request && call.request.greeting;
    for (let i = 0; i < STREAM_REPLY_COUNT; i++) {
      if (call.cancelled) return;
      call.write(buildReply(greeting, ` #${i + 1}`));
    }
    call.end();
  },

  LotsOfGreetings(call, callback) {
    const greetings = [];
    call.on('data', (msg) => {
      if (msg && typeof msg.greeting === 'string') greetings.push(msg.greeting);
    });
    call.on('end', () => {
      callback(null, buildReply(greetings.join(', ')));
    });
    call.on('error', (err) => {
      console.error('LotsOfGreetings stream error', err);
    });
  },

  BidiHello(call) {
    call.on('data', (msg) => {
      const greeting = msg && typeof msg.greeting === 'string' ? msg.greeting : '';
      call.write(buildReply(greeting));
    });
    call.on('end', () => call.end());
    call.on('error', (err) => {
      console.error('BidiHello stream error', err);
    });
  }
};

const bind = (server, address, credentials) =>
  new Promise((resolve, reject) => {
    server.bindAsync(address, credentials, (err, boundPort) => {
      if (err) return reject(err);
      console.log(`gRPC testbench started on port: ${boundPort}`);
      resolve(boundPort);
    });
  });

const start = async () => {
  const port = process.env.GRPC_PORT || 50051;

  const server = new grpc.Server();
  server.addService(helloService, handlers);

  // Register reflection so Bruno's reflection-based method discovery works
  // against this server without needing the proto file client-side.
  const reflection = new ReflectionService(packageDefinition);
  reflection.addToServer(server);

  try {
    await bind(server, `0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure());
  } catch (err) {
    console.error('Failed to bind gRPC server', err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = { start };
