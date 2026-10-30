import * as net from 'net';
import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest } from '../../utils/page';

const TLS_EXTENSION_KEY_SHARE = 0x0033;
const GROUP_X25519 = 0x001d;
const GROUP_X25519_MLKEM768 = 0x11ec;

// Reads the named groups the client sent key shares for from a raw TLS ClientHello record.
// Same parser as packages/bruno-cli/tests/integration/tls-client-hello, which guards the CLI's pin.
const parseKeyShareGroups = (record: Buffer): number[] => {
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
      const groups: number[] = [];
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

// Some older TLS servers reset the connection when the ClientHello carries a post-quantum
// key share, so the electron main process pins tls.DEFAULT_ECDH_CURVE. This captures the
// handshake the app actually sends and closes the socket, so no certificate is involved.
test.describe('TLS ClientHello', () => {
  let server: net.Server;
  let port: number;
  let clientHello: Buffer | undefined;

  test.beforeAll(async () => {
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
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as net.AddressInfo).port;
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('offers only classical key shares', async ({ page, createTmpDir }) => {
    await test.step('Create a request to the capturing server', async () => {
      await createCollection(page, 'tls-client-hello', await createTmpDir('tls-client-hello'));
      await createRequest(page, 'handshake', 'tls-client-hello', { url: `https://127.0.0.1:${port}/` });
    });

    await test.step('Send the request', async () => {
      await page.getByTestId('send-arrow-icon').click();
      await expect.poll(() => clientHello).toBeDefined();
    });

    await test.step('ClientHello has no post-quantum key share', async () => {
      const groups = parseKeyShareGroups(clientHello!);
      expect(groups).toContain(GROUP_X25519);
      expect(groups).not.toContain(GROUP_X25519_MLKEM768);
    });
  });
});
