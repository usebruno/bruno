/**
 * @jest-environment node
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { GrpcClient, processGrpcMetadata } = require('./grpc-client');

const PROTO = `
syntax = "proto3";
package repro;
service Repro {
  rpc Ping (Empty) returns (Empty);
}
message Empty {}
`;

// Not valid UTF-8, so decoding it as text would corrupt it
const STATUS_DETAILS = Buffer.from([0x08, 0x03, 0x1a, 0xd4, 0x01, 0x12, 0xa0, 0x01, 0xf4, 0x03]);
const HEADER_BIN = Buffer.from([0xff, 0x00, 0xfe]);

const findValue = (metadata, name) => metadata.find((entry) => entry.name === name)?.value;

describe('gRPC binary metadata', () => {
  let tmpDir;
  let protoPath;
  let server;
  let port;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-grpc-bin-'));
    protoPath = path.join(tmpDir, 'repro.proto');
    fs.writeFileSync(protoPath, PROTO);

    const { repro } = grpc.loadPackageDefinition(protoLoader.loadSync(protoPath));
    server = new grpc.Server();
    server.addService(repro.Repro.service, {
      Ping: (call, callback) => {
        const headers = new grpc.Metadata();
        headers.set('x-header-bin', HEADER_BIN);
        call.sendMetadata(headers);

        const trailers = new grpc.Metadata();
        trailers.set('grpc-status-details-bin', STATUS_DETAILS);
        callback({ code: grpc.status.INVALID_ARGUMENT, details: 'repro', metadata: trailers });
      }
    });
    port = await new Promise((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (error, boundPort) =>
        error ? reject(error) : resolve(boundPort));
    });
  });

  afterAll(() => {
    server.forceShutdown();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reports binary headers and trailers from a server as base64', async () => {
    const events = [];
    let resolveDone;
    const done = new Promise((resolve) => {
      resolveDone = resolve;
    });
    const client = new GrpcClient((event, requestId, collectionUid, payload) => {
      events.push({ event, payload });
      if (event === 'grpc:status') {
        resolveDone();
      }
    });

    await client.loadMethodsFromProtoFile(protoPath);
    await client.startConnection({
      request: {
        uid: 'request-uid',
        url: `grpc://127.0.0.1:${port}`,
        method: '/repro.Repro/Ping',
        headers: {},
        body: { grpc: [{ content: '{}' }] }
      },
      collection: { uid: 'collection-uid', pathname: tmpDir }
    });
    await done;

    const headers = events.find(({ event }) => event === 'grpc:metadata').payload.metadata;
    expect(findValue(headers, 'x-header-bin')).toBe(HEADER_BIN.toString('base64'));

    const { status } = events.find(({ event }) => event === 'grpc:status').payload;
    expect(findValue(status.metadata, 'grpc-status-details-bin')).toBe('CAMa1AESoAH0Aw==');
  });
});

describe('processGrpcMetadata', () => {
  it('base64 encodes JSON-cloned Buffers and keeps text values', () => {
    const metadata = {
      'x-cloned-bin': JSON.parse(JSON.stringify(STATUS_DETAILS)),
      'x-multi-bin': [HEADER_BIN, STATUS_DETAILS],
      'content-type': 'application/grpc'
    };

    expect(processGrpcMetadata(metadata)).toEqual([
      { name: 'x-cloned-bin', value: 'CAMa1AESoAH0Aw==' },
      { name: 'x-multi-bin', value: `${HEADER_BIN.toString('base64')}, CAMa1AESoAH0Aw==` },
      { name: 'content-type', value: 'application/grpc' }
    ]);
  });
});
