import net from 'node:net';
import http2 from 'node:http2';
import { PassThrough } from 'node:stream';
import { SocksProxyAgent } from 'socks-proxy-agent';
import {
  isSocksProxyAgent,
  socks5ProxyKeyFor,
  connectSocks5ForHttp2,
  createHttp2CreateConnection
} from './socks5-agent';

/** Self-signed PEM pair via OpenSSL (available in CI / Cloud Agent images). */
function pemSelfSigned(): { key: string; cert: string } {
  const { execFileSync } = require('node:child_process');
  const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
  const { join } = require('node:path');
  const { tmpdir } = require('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'bruno-h2-socks-'));
  const keyPath = join(dir, 'key.pem');
  const certPath = join(dir, 'cert.pem');
  try {
    execFileSync('openssl', ['genrsa', '-out', keyPath, '2048'], { stdio: 'ignore' });
    execFileSync('openssl', ['req', '-new', '-x509', '-key', keyPath, '-out', certPath, '-subj', '/CN=localhost', '-days', '1'], {
      stdio: 'ignore'
    });
    return { key: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Tiny SOCKS5 CONNECT proxy (no-auth and user/pass). Enough to exercise SocksProxyAgent
 * against a real TCP path without pulling in a SOCKS server dependency.
 */
function startSocks5Server(options: { username?: string; password?: string } = {}) {
  const requireAuth = Boolean(options.username || options.password);

  const server = net.createServer((client) => {
    let buf = Buffer.alloc(0);
    let stage: 'greeting' | 'auth' | 'request' | 'relay' = 'greeting';
    let remote: net.Socket | null = null;

    const onData = (chunk: Buffer) => {
      if (stage === 'relay') return;
      buf = Buffer.concat([buf, chunk]);

      if (stage === 'greeting') {
        if (buf.length < 2) return;
        const nMethods = buf[1];
        if (buf.length < 2 + nMethods) return;
        buf = buf.subarray(2 + nMethods);
        if (requireAuth) {
          client.write(Buffer.from([0x05, 0x02])); // username/password
          stage = 'auth';
        } else {
          client.write(Buffer.from([0x05, 0x00])); // no auth
          stage = 'request';
        }
      }

      if (stage === 'auth') {
        if (buf.length < 2) return;
        const ulen = buf[1];
        if (buf.length < 2 + ulen + 1) return;
        const username = buf.subarray(2, 2 + ulen).toString();
        const plen = buf[2 + ulen];
        if (buf.length < 2 + ulen + 1 + plen) return;
        const password = buf.subarray(2 + ulen + 1, 2 + ulen + 1 + plen).toString();
        buf = buf.subarray(2 + ulen + 1 + plen);
        const ok = username === (options.username || '') && password === (options.password || '');
        client.write(Buffer.from([0x01, ok ? 0x00 : 0x01]));
        if (!ok) {
          client.destroy();
          return;
        }
        stage = 'request';
      }

      if (stage === 'request') {
        if (buf.length < 4) return;
        const cmd = buf[1];
        const atyp = buf[3];
        let offset = 4;
        let host = '';
        if (atyp === 0x01) {
          if (buf.length < offset + 4 + 2) return;
          host = `${buf[offset]}.${buf[offset + 1]}.${buf[offset + 2]}.${buf[offset + 3]}`;
          offset += 4;
        } else if (atyp === 0x03) {
          if (buf.length < offset + 1) return;
          const len = buf[offset];
          if (buf.length < offset + 1 + len + 2) return;
          host = buf.subarray(offset + 1, offset + 1 + len).toString();
          offset += 1 + len;
        } else {
          client.destroy();
          return;
        }
        const port = buf.readUInt16BE(offset);
        buf = buf.subarray(offset + 2);

        if (cmd !== 0x01) {
          client.write(Buffer.from([0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
          client.destroy();
          return;
        }

        remote = net.connect({ host, port }, () => {
          client.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
          stage = 'relay';
          client.removeListener('data', onData);
          if (buf.length) remote!.write(buf);
          client.pipe(remote!);
          remote!.pipe(client);
        });
        remote.on('error', () => {
          client.write(Buffer.from([0x05, 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
          client.destroy();
        });
      }
    };

    client.on('data', onData);
    client.on('error', () => remote?.destroy());
    client.on('close', () => remote?.destroy());
  });

  return new Promise<{ server: net.Server; port: number; close: () => Promise<void> }>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('socks server missing port'));
        return;
      }
      resolve({
        server,
        port: address.port,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          })
      });
    });
  });
}

function startHttp2Origin(cert: { key: string; cert: string }) {
  const server = http2.createSecureServer(
    {
      key: cert.key,
      cert: cert.cert,
      allowHTTP1: false,
      // Force h2 via ALPN by only advertising h2 (Node does this for createSecureServer).
    },
    (req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`ok-${req.httpVersion}`);
    }
  );

  return new Promise<{ server: http2.Http2SecureServer; port: number; close: () => Promise<void> }>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('h2 origin missing port'));
        return;
      }
      resolve({
        server,
        port: address.port,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          })
      });
    });
  });
}

describe('socks5 http2 agent', () => {
  let cert: { key: string; cert: string };

  beforeAll(() => {
    cert = pemSelfSigned();
  });

  describe('socks5ProxyKeyFor', () => {
    it('identifies SocksProxyAgent instances', () => {
      const agent = new SocksProxyAgent('socks5://127.0.0.1:1080');
      expect(isSocksProxyAgent(agent)).toBe(true);
      expect(isSocksProxyAgent({ connect: () => {}, proxy: { href: 'http://x' } })).toBe(false);
      expect(isSocksProxyAgent(null)).toBe(false);
    });

    it('builds a socks5 key and fingerprints credentials without exposing them', () => {
      const plain = new SocksProxyAgent('socks5://127.0.0.1:1080');
      const authedA = new SocksProxyAgent('socks5://alice:secret-a@127.0.0.1:1080');
      const authedB = new SocksProxyAgent('socks5://alice:secret-b@127.0.0.1:1080');
      const sameAsA = new SocksProxyAgent('socks5://alice:secret-a@127.0.0.1:1080');

      expect(socks5ProxyKeyFor(plain)).toBe('socks5://127.0.0.1:1080');
      expect(socks5ProxyKeyFor(authedA)).toMatch(/^socks5:\/\/127\.0\.0\.1:1080#[0-9a-f]{16}$/);
      expect(socks5ProxyKeyFor(authedA)).not.toContain('secret');
      expect(socks5ProxyKeyFor(authedA)).not.toContain('alice');
      expect(socks5ProxyKeyFor(authedA)).not.toBe(socks5ProxyKeyFor(authedB));
      expect(socks5ProxyKeyFor(authedA)).toBe(socks5ProxyKeyFor(sameAsA));
      expect(socks5ProxyKeyFor(authedA)).not.toBe(socks5ProxyKeyFor(plain));
    });
  });

  describe('connectSocks5ForHttp2 + http2.connect', () => {
    it('tunnels TLS/ALPN h2 through SOCKS5 and serves a request', async () => {
      const socks = await startSocks5Server();
      const origin = await startHttp2Origin(cert);

      try {
        const agent = new SocksProxyAgent(`socks5://127.0.0.1:${socks.port}`);
        // Use 127.0.0.1 (not localhost) so client-side SOCKS DNS cannot pick ::1 while
        // the test servers are bound to IPv4 only.
        const tunnel = await connectSocks5ForHttp2({
          agent,
          hostname: '127.0.0.1',
          port: origin.port,
          tlsOptions: {
            rejectUnauthorized: false,
            ca: cert.cert
          },
          alpnProtocols: ['h2']
        });

        expect(tunnel.alpn).toBe('h2');
        expect(tunnel.socket.encrypted).toBe(true);

        const authority = `https://127.0.0.1:${origin.port}`;
        const session = http2.connect(authority, {
          createConnection: createHttp2CreateConnection(tunnel.socket)
        });

        try {
          const body = await new Promise<string>((resolve, reject) => {
            const stream = session.request({ ':method': 'GET', ':path': '/' });
            const chunks: Buffer[] = [];
            stream.on('data', (c) => chunks.push(c));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            stream.end();
          });
          expect(body).toBe('ok-2.0');
        } finally {
          session.close();
        }
      } finally {
        await Promise.all([socks.close(), origin.close()]);
      }
    });

    it('tunnels through an authenticated SOCKS5 proxy', async () => {
      const socks = await startSocks5Server({ username: 'bruno', password: 'socks-pass' });
      const origin = await startHttp2Origin(cert);

      try {
        const agent = new SocksProxyAgent(`socks5://bruno:socks-pass@127.0.0.1:${socks.port}`);
        const tunnel = await connectSocks5ForHttp2({
          agent,
          hostname: '127.0.0.1',
          port: origin.port,
          tlsOptions: { rejectUnauthorized: false, ca: cert.cert },
          alpnProtocols: ['h2', 'http/1.1']
        });

        expect(tunnel.alpn).toBe('h2');
        expect(socks5ProxyKeyFor(agent)).toMatch(/#/);
        tunnel.socket.destroy();
      } finally {
        await Promise.all([socks.close(), origin.close()]);
      }
    });

    it('rejects a non-socks agent', async () => {
      await expect(
        connectSocks5ForHttp2({
          agent: { connect: async () => null, proxy: { href: 'http://proxy' } } as any,
          hostname: 'example.com'
        })
      ).rejects.toMatchObject({ code: 'ERR_BRUNO_NOT_SOCKS_AGENT' });
    });

    it('createHttp2CreateConnection is single-use', () => {
      const fake = new PassThrough();
      const createConnection = createHttp2CreateConnection(fake);
      expect(createConnection()).toBe(fake);
      expect(() => createConnection()).toThrow(/already consumed/);
      fake.destroy();
    });
  });
});
