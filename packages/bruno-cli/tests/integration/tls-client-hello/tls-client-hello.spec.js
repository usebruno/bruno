const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const net = require('net');
const tls = require('tls');
const path = require('path');
const { runCli } = require('../helpers/run-cli');
const { copyFixtureToTmpDir, removeTmpDir } = require('../helpers/tmp-dir');

const RUN_TIMEOUT = 60000;

const TLS_EXTENSION_SUPPORTED_GROUPS = 0x000a;
const TLS_EXTENSION_KEY_SHARE = 0x0033;
const GROUP_X25519 = 0x001d;
const GROUP_X25519_MLKEM768 = 0x11ec;

// Reads the advertised groups (supported_groups) and the groups the client sent key shares
// for (key_share) from a raw TLS ClientHello record.
const parseClientHelloGroups = (record) => {
  const result = { supportedGroups: [], keyShareGroups: [] };
  // record header (5) + handshake header (4) + legacy_version (2) + random (32)
  let offset = 43;
  offset += 1 + record[offset]; // session_id
  offset += 2 + record.readUInt16BE(offset); // cipher_suites
  offset += 1 + record[offset]; // compression_methods

  const extensionsEnd = offset + 2 + record.readUInt16BE(offset);
  offset += 2;
  while (offset < extensionsEnd) {
    const type = record.readUInt16BE(offset);
    const length = record.readUInt16BE(offset + 2);
    // extension header (4) + list length (2)
    if (type === TLS_EXTENSION_SUPPORTED_GROUPS) {
      for (let entry = offset + 6; entry < offset + 4 + length; entry += 2) {
        result.supportedGroups.push(record.readUInt16BE(entry));
      }
    }
    if (type === TLS_EXTENSION_KEY_SHARE) {
      let entry = offset + 6;
      while (entry < offset + 4 + length) {
        result.keyShareGroups.push(record.readUInt16BE(entry));
        entry += 4 + record.readUInt16BE(entry + 2);
      }
    }
    offset += 4 + length;
  }
  return result;
};

const runtimeSupportsHybridGroup = (() => {
  try {
    tls.createSecureContext({ ecdhCurve: 'X25519MLKEM768' });
    return true;
  } catch {
    return false;
  }
})();

// Some older TLS servers reset the connection when the ClientHello carries a post-quantum
// key share, while post-quantum-only servers need the hybrid group advertised. bin/bru.js sets
// tls.DEFAULT_ECDH_CURVE to advertise it without sending its key share. This captures the
// handshake the CLI actually sends and closes the socket, so no certificate or network is involved.
describe('CLI run — TLS ClientHello', () => {
  let server;
  let host;
  let clientHello;
  let tmpDir;

  beforeAll(async () => {
    server = net.createServer((socket) => {
      let received = Buffer.alloc(0);
      socket.on('data', (chunk) => {
        received = Buffer.concat([received, chunk]);
        if (received.length >= 5 && received.length >= 5 + received.readUInt16BE(3)) {
          clientHello ??= received;
          socket.destroy();
        }
      });
      socket.on('error', () => {});
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    host = `https://127.0.0.1:${server.address().port}`;
    tmpDir = copyFixtureToTmpDir(path.join(__dirname, 'fixtures', 'collection'), 'tls-client-hello');
  });

  afterAll(async () => {
    removeTmpDir(tmpDir);
    await new Promise((resolve) => server.close(resolve));
  });

  it('offers only classical key shares', async () => {
    await runCli(['run', 'handshake.bru', '--env-var', `host=${host}`], tmpDir);

    expect(clientHello).toBeDefined();
    const { keyShareGroups } = parseClientHelloGroups(clientHello);
    expect(keyShareGroups).toEqual([GROUP_X25519]);
  }, RUN_TIMEOUT);

  // Runs after the test above, which captures the ClientHello.
  (runtimeSupportsHybridGroup ? it : it.skip)('advertises the hybrid post-quantum group', () => {
    expect(clientHello).toBeDefined();
    const { supportedGroups } = parseClientHelloGroups(clientHello);
    expect(supportedGroups).toContain(GROUP_X25519_MLKEM768);
  });
});
