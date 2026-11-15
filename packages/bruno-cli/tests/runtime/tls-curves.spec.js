const { test } = require('@jest/globals');
const assert = require('node:assert/strict');
const tls = require('node:tls');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const source = fs.readFileSync(path.resolve(__dirname, '../../bin/bru.js'), 'utf8');
const classical = 'X25519:P-256:X448:P-521:P-384:ffdhe2048:ffdhe3072:ffdhe4096:ffdhe6144:ffdhe8192';
function configure(runtime) {
  vm.runInNewContext(source.replace(/^#!.*\n/, ''), {
    require(name) {
      if (name === 'node:tls') return runtime;
      if (name === '../src') return { run() {} };
      throw new Error(`Unexpected module: ${name}`);
    }
  });
}

test('keeps classical groups when the runtime rejects the hybrid group', () => {
  const runtime = {
    createSecureContext() { throw new Error('Unsupported group'); }
  };
  configure(runtime);
  assert.equal(runtime.DEFAULT_ECDH_CURVE, classical);
});

test('connects to hybrid-only and classical TLS 1.3 servers', async () => {
  try {
    tls.createSecureContext({ ecdhCurve: 'X25519MLKEM768' });
  } catch {
    return;
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-tls-'));
  const original = tls.DEFAULT_ECDH_CURVE;
  const cleanup = () => {
    tls.DEFAULT_ECDH_CURVE = original;
    fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  };
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-keyout', path.join(scratch, 'key.pem'), '-out', path.join(scratch, 'cert.pem'),
      '-subj', '/CN=localhost', '-days', '1'], { stdio: 'ignore' });
    configure(tls);
    for (const group of ['X25519MLKEM768', 'X25519']) {
      const server = tls.createServer({
        key: fs.readFileSync(path.join(scratch, 'key.pem')),
        cert: fs.readFileSync(path.join(scratch, 'cert.pem')),
        minVersion: 'TLSv1.3', ecdhCurve: group
      }, (socket) => socket.end());
      server.on('tlsClientError', () => {});
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      try {
        await new Promise((resolve, reject) => {
          const socket = tls.connect({ host: '127.0.0.1', port: server.address().port,
            rejectUnauthorized: false, minVersion: 'TLSv1.3' }, () => {
            socket.destroy();
            resolve();
          });
          socket.on('error', reject);
          socket.setTimeout(2000, () => socket.destroy(new Error('TLS handshake timed out')));
        });
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    }
  } finally {
    cleanup();
  }
});

const net = require('node:net');
const TLS_EXTENSION_KEY_SHARE = 0x0033;
// Reads the named groups the client sent key shares for from a raw TLS ClientHello record.
const parseKeyShareGroups = (record) => {
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
    if (type === TLS_EXTENSION_KEY_SHARE) {
      const groups = [];
      // extension header (4) + client_shares length (2)
      let entry = offset + 6;
      while (entry < offset + 4 + length) {
        groups.push(record.readUInt16BE(entry));
        entry += 4 + record.readUInt16BE(entry + 2);
      }
      return groups;
    }
    offset += 4 + length;
  }
  return [];
};

test('keeps the initial key shares classical for older servers', async () => {
  const original = tls.DEFAULT_ECDH_CURVE;
  configure(tls);
  let client;
  let capture;
  const hello = new Promise((resolve) => { capture = resolve; });
  const server = net.createServer((socket) => {
    let received = Buffer.alloc(0);
    socket.on('error', () => {});
    socket.on('data', (chunk) => {
      received = Buffer.concat([received, chunk]);
      if (received.length >= 5 && received.length >= 5 + received.readUInt16BE(3)) {
        capture(received);
        socket.destroy();
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    client = tls.connect({ host: '127.0.0.1', port: server.address().port,
      rejectUnauthorized: false });
    client.on('error', () => {});
    client.setTimeout(2000, () => client.destroy());
    const groups = parseKeyShareGroups(await hello);
    assert.ok(groups.includes(0x001d));
    assert.ok(!groups.includes(0x11ec));
  } finally {
    client?.destroy();
    tls.DEFAULT_ECDH_CURVE = original;
    await new Promise((resolve) => server.close(resolve));
  }
});
