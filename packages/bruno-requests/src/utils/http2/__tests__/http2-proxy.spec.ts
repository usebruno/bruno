import net from 'node:net';
import { EventEmitter } from 'node:events';

const mockSocksCreate = jest.fn();
jest.mock('socks', () => ({
  SocksClient: { createConnection: (...args: unknown[]) => mockSocksCreate(...args) }
}));

import { connectThroughProxy } from '../http2-proxy';

type FakeProxy = {
  port: number;
  /** CONNECT requests the proxy received, as raw header blocks. */
  requests: string[];
  close: () => Promise<void>;
};

/**
 * A minimal HTTP CONNECT proxy for tests. It parses the CONNECT request, optionally
 * checks Proxy-Authorization, replies 200 (then echoes bytes back so the caller can
 * confirm the tunnel is live) or an error status.
 */
const startFakeProxy = (opts: { requireAuth?: string } = {}): Promise<FakeProxy> => {
  const requests: string[] = [];
  const sockets: net.Socket[] = [];
  const server = net.createServer((socket) => {
    sockets.push(socket);
    let buffer = '';
    const onData = (chunk: Buffer): void => {
      buffer += chunk.toString('latin1');
      const end = buffer.indexOf('\r\n\r\n');
      if (end === -1) return;
      socket.removeListener('data', onData);
      const headerBlock = buffer.slice(0, end);
      requests.push(headerBlock);

      if (opts.requireAuth) {
        const match = headerBlock.match(/proxy-authorization:\s*(.+?)(?:\r?\n|$)/i);
        if (!match || match[1].trim() !== opts.requireAuth) {
          socket.end('HTTP/1.1 407 Proxy Authentication Required\r\n\r\n');
          return;
        }
      }

      socket.write('HTTP/1.1 200 Connection established\r\n\r\n');
      // Echo subsequent bytes so the test can prove the tunnel carries origin traffic.
      socket.on('data', (d) => socket.write(d));
    };
    socket.on('data', onData);
    socket.on('error', () => {});
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      server.unref();
      const port = (server.address() as net.AddressInfo).port;
      resolve({
        port,
        requests,
        close: () =>
          new Promise((r) => {
            for (const sock of sockets) sock.destroy();
            server.close(() => r());
          })
      });
    });
  });
};

describe('connectThroughProxy (CONNECT)', () => {
  it('tunnels through an HTTP proxy and returns a live socket to the origin', async () => {
    const proxy = await startFakeProxy();
    const socket = await connectThroughProxy({
      proxyUri: `http://127.0.0.1:${proxy.port}`,
      targetHost: 'example.test',
      targetPort: 443
    });

    expect(proxy.requests[0]).toContain('CONNECT example.test:443 HTTP/1.1');
    // The tunnel is live: bytes we write come back from the echo proxy.
    const echoed = await new Promise<string>((resolve) => {
      socket.once('data', (d: Buffer) => resolve(d.toString()));
      socket.write('ping');
    });
    expect(echoed).toBe('ping');

    socket.destroy();
    await proxy.close();
  });

  it('sends Proxy-Authorization from the proxy URL userinfo', async () => {
    const expected = `Basic ${Buffer.from('user:pass').toString('base64')}`;
    const proxy = await startFakeProxy({ requireAuth: expected });
    const socket = await connectThroughProxy({
      proxyUri: `http://user:pass@127.0.0.1:${proxy.port}`,
      targetHost: 'example.test',
      targetPort: 443
    });
    expect(proxy.requests[0].toLowerCase()).toContain('proxy-authorization:');
    socket.destroy();
    await proxy.close();
  });

  it('rejects when the proxy refuses auth (407)', async () => {
    const proxy = await startFakeProxy({ requireAuth: 'Basic good' });
    await expect(
      connectThroughProxy({
        proxyUri: `http://user:wrong@127.0.0.1:${proxy.port}`,
        targetHost: 'example.test',
        targetPort: 443
      })
    ).rejects.toThrow(/407/);
    await proxy.close();
  });

  it('rejects when the proxy is unreachable', async () => {
    // Port 1 is privileged and closed; the connect fails fast.
    await expect(
      connectThroughProxy({ proxyUri: 'http://127.0.0.1:1', targetHost: 'example.test', targetPort: 443, timeoutMs: 2000 })
    ).rejects.toThrow();
  });

  it('rejects an unsupported proxy protocol', async () => {
    await expect(
      connectThroughProxy({ proxyUri: 'ftp://127.0.0.1:21', targetHost: 'example.test', targetPort: 443 })
    ).rejects.toThrow(/Unsupported proxy protocol/);
  });

  it('rejects an invalid proxy URL', async () => {
    await expect(
      connectThroughProxy({ proxyUri: 'not a url', targetHost: 'example.test', targetPort: 443 })
    ).rejects.toThrow(/Invalid proxy URL/);
  });
});

describe('connectThroughProxy (SOCKS)', () => {
  beforeEach(() => mockSocksCreate.mockReset());

  const fakeSocket = () => new EventEmitter() as unknown as net.Socket;

  it('opens a SOCKS5 tunnel with user+password and the origin as destination', async () => {
    const socket = fakeSocket();
    mockSocksCreate.mockResolvedValue({ socket });
    const returned = await connectThroughProxy({
      proxyUri: 'socks5://user:pass@127.0.0.1:1080',
      targetHost: 'example.test',
      targetPort: 443
    });
    expect(returned).toBe(socket);
    const opts = mockSocksCreate.mock.calls[0][0];
    expect(opts.command).toBe('connect');
    expect(opts.destination).toEqual({ host: 'example.test', port: 443 });
    expect(opts.proxy).toMatchObject({ host: '127.0.0.1', port: 1080, type: 5, userId: 'user', password: 'pass' });
  });

  it('maps socks4:// to version 4 and sends userId only (no password)', async () => {
    mockSocksCreate.mockResolvedValue({ socket: fakeSocket() });
    await connectThroughProxy({ proxyUri: 'socks4://bob:secret@127.0.0.1:1080', targetHost: 'example.test', targetPort: 443 });
    const opts = mockSocksCreate.mock.calls[0][0];
    expect(opts.proxy.type).toBe(4);
    expect(opts.proxy.userId).toBe('bob');
    expect(opts.proxy.password).toBeUndefined();
  });

  it('treats socks4a:// as version 4 and socks5h:// as version 5', async () => {
    mockSocksCreate.mockResolvedValue({ socket: fakeSocket() });
    await connectThroughProxy({ proxyUri: 'socks4a://127.0.0.1:1080', targetHost: 'example.test', targetPort: 443 });
    await connectThroughProxy({ proxyUri: 'socks5h://127.0.0.1:1080', targetHost: 'example.test', targetPort: 443 });
    expect(mockSocksCreate.mock.calls[0][0].proxy.type).toBe(4);
    expect(mockSocksCreate.mock.calls[1][0].proxy.type).toBe(5);
  });

  it('omits auth fields when the proxy URL has no userinfo', async () => {
    mockSocksCreate.mockResolvedValue({ socket: fakeSocket() });
    await connectThroughProxy({ proxyUri: 'socks5://127.0.0.1:1080', targetHost: 'example.test', targetPort: 443 });
    const opts = mockSocksCreate.mock.calls[0][0];
    expect(opts.proxy.userId).toBeUndefined();
    expect(opts.proxy.password).toBeUndefined();
  });

  it('rejects when the SOCKS handshake fails', async () => {
    mockSocksCreate.mockRejectedValue(new Error('Socks5 proxy rejected connection - Failure'));
    await expect(
      connectThroughProxy({ proxyUri: 'socks5://127.0.0.1:1080', targetHost: 'example.test', targetPort: 443 })
    ).rejects.toThrow(/Socks5 proxy rejected/);
  });
});
