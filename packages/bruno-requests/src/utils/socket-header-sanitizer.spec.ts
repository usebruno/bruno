import http from 'node:http';
import net from 'node:net';
import { once } from 'node:events';
import axios from 'axios';
import {
  installSocketHeaderSanitizer,
  withSocketHeaderSanitizer,
  sanitizeHeaderBlock,
  hasChunkedTransferEncoding
} from './socket-header-sanitizer';
import { getOrCreateHttpAgent, clearAgentCache } from './agent-cache';

function collectData(socket: net.Socket): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    socket.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    socket.on('end', () => resolve(Buffer.concat(chunks)));
    socket.on('error', reject);
  });
}

/** Push bytes through the sanitizer by emitting on a real connected socket pair. */
async function sanitizedBytesFromServer(writeToClient: (socket: net.Socket) => void): Promise<Buffer> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as net.AddressInfo;

  try {
    const serverConnPromise = once(server, 'connection').then(([s]) => s as net.Socket);
    const client = net.connect({ host: '127.0.0.1', port });
    await once(client, 'connect');
    installSocketHeaderSanitizer(client);

    const received = collectData(client);
    const serverSocket = await serverConnPromise;
    writeToClient(serverSocket);

    const data = await received;
    client.destroy();
    return data;
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

describe('sanitizeHeaderBlock', () => {
  it('strips Content-Length when it is the last header and TE is chunked', () => {
    const raw = 'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Length: 5';
    const out = sanitizeHeaderBlock(raw);
    expect(out).toBe('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked');
    expect(out).not.toMatch(/content-length/i);
  });

  it('strips Content-Length when TE is a token list including chunked', () => {
    const raw = 'HTTP/1.1 200 OK\r\nTransfer-Encoding: gzip, chunked\r\nContent-Length: 9\r\nContent-Type: text/plain';
    const out = sanitizeHeaderBlock(raw);
    expect(out).toMatch(/Transfer-Encoding: gzip, chunked/i);
    expect(out).toMatch(/Content-Type: text\/plain/i);
    expect(out).not.toMatch(/content-length/i);
  });

  it('does not strip Content-Length when TE is not chunked', () => {
    const raw = 'HTTP/1.1 200 OK\r\nContent-Length: 5\r\nContent-Type: text/plain';
    expect(sanitizeHeaderBlock(raw)).toBe(raw);
  });

  it('does not treat chunkedfoo as chunked', () => {
    const headerLines = ['Transfer-Encoding: chunkedfoo'];
    expect(hasChunkedTransferEncoding(headerLines)).toBe(false);
  });
});

describe('installSocketHeaderSanitizer', () => {
  it('is idempotent and preserves socket identity', async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as net.AddressInfo;
    try {
      const client = net.connect({ host: '127.0.0.1', port });
      await once(client, 'connect');

      const first = installSocketHeaderSanitizer(client);
      const second = installSocketHeaderSanitizer(client);
      expect(first).toBe(client);
      expect(second).toBe(client);

      client.destroy();
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });

  it('strips conflicting Content-Length from a response (CL last)', async () => {
    const body = '5\r\nhello\r\n0\r\n\r\n';
    const data = await sanitizedBytesFromServer((socket) => {
      socket.end(
        Buffer.from(
          `HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Length: 5\r\n\r\n${body}`,
          'latin1'
        )
      );
    });
    const text = data.toString('latin1');
    expect(text).toContain('Transfer-Encoding: chunked\r\n\r\n');
    expect(text).not.toMatch(/content-length:/i);
    expect(text).toContain(body);
  });

  it('buffers until the full header block arrives across chunks', async () => {
    const body = '0\r\n\r\n';
    const full = Buffer.from(
      `HTTP/1.1 200 OK\r\nContent-Length: 0\r\nTransfer-Encoding: chunked\r\n\r\n${body}`,
      'latin1'
    );

    const data = await sanitizedBytesFromServer((socket) => {
      socket.write(full.subarray(0, 40));
      setImmediate(() => {
        socket.end(full.subarray(40));
      });
    });

    const text = data.toString('latin1');
    expect(text).not.toMatch(/content-length:/i);
    expect(text).toContain(body);
  });

  it('sanitizes the final response after a 100 Continue', async () => {
    const body = '0\r\n\r\n';
    const data = await sanitizedBytesFromServer((socket) => {
      socket.end(
        Buffer.from(
          'HTTP/1.1 100 Continue\r\n\r\n'
          + 'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Length: 1\r\n\r\n'
          + body,
          'latin1'
        )
      );
    });
    const text = data.toString('latin1');
    expect(text).toContain('HTTP/1.1 100 Continue\r\n\r\n');
    expect(text).toContain('Transfer-Encoding: chunked\r\n\r\n');
    expect(text).not.toMatch(/content-length:/i);
    expect(text).toContain(body);
  });

  it('forwards incomplete headers on EOF unchanged', async () => {
    const partial = 'HTTP/1.1 200 OK\r\nContent-Length: 5';
    const data = await sanitizedBytesFromServer((socket) => {
      socket.end(Buffer.from(partial, 'latin1'));
    });
    expect(data.toString('latin1')).toBe(partial);
  });

  it('re-arms on reuseSocket for a second keep-alive response', async () => {
    const SanitizingAgent = withSocketHeaderSanitizer(http.Agent);
    const agent = new SanitizingAgent({ keepAlive: true });

    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as net.AddressInfo;

    try {
      const serverConnPromise = once(server, 'connection').then(([s]) => s as net.Socket);
      const socket = agent.createConnection({ host: '127.0.0.1', port }) as net.Socket;
      await once(socket, 'connect');
      const serverSocket = await serverConnPromise;

      const chunks: Buffer[] = [];
      const waitForHttpResponses = (n: number) =>
        new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(`timed out waiting for ${n} responses`)), 2000);
          const check = () => {
            const text = Buffer.concat(chunks).toString('latin1');
            const count = (text.match(/HTTP\/1\.1 200 OK/g) || []).length;
            if (count >= n) {
              clearTimeout(timer);
              resolve();
            }
          };
          socket.on('data', (c) => {
            chunks.push(Buffer.from(c));
            check();
          });
        });

      const resp = (cl: string) =>
        Buffer.from(
          `HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Length: ${cl}\r\n\r\n0\r\n\r\n`,
          'latin1'
        );

      const firstWait = waitForHttpResponses(1);
      serverSocket.write(resp('1'));
      await firstWait;

      agent.reuseSocket(socket, {} as any);

      const secondWait = waitForHttpResponses(2);
      serverSocket.write(resp('2'));
      await secondWait;

      const text = Buffer.concat(chunks).toString('latin1');
      expect(text).not.toMatch(/content-length:/i);

      socket.destroy();
      serverSocket.destroy();
    } finally {
      agent.destroy();
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });
});

describe('withSocketHeaderSanitizer + Node Agent.createSocket contract', () => {
  it('sanitizes the sync return value used by Agent.createSocket', async () => {
    const SanitizingAgent = withSocketHeaderSanitizer(http.Agent);
    const agent = new SanitizingAgent({ keepAlive: false });

    const server = net.createServer((socket) => {
      socket.once('data', () => {
        socket.end(
          Buffer.from(
            'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Length: 5\r\nContent-Type: text/plain\r\n\r\n'
            + '5\r\nhello\r\n0\r\n\r\n',
            'latin1'
          )
        );
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as net.AddressInfo;

    try {
      const response = await axios.get(`http://127.0.0.1:${port}/`, {
        httpAgent: agent,
        proxy: false,
        responseType: 'text',
        transformResponse: [(d) => d]
      });

      expect(response.status).toBe(200);
      expect(response.data).toBe('hello');
    } finally {
      agent.destroy();
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });
});

describe('getOrCreateHttpAgent integration', () => {
  beforeEach(() => {
    clearAgentCache();
  });

  afterEach(() => {
    clearAgentCache();
  });

  it('lets Axios parse a conflicting-header response via cached agents', async () => {
    const server = net.createServer((socket) => {
      socket.once('data', () => {
        socket.end(
          Buffer.from(
            'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Length: 11\r\nContent-Type: text/plain\r\n\r\n'
            + 'b\r\nhello world\r\n0\r\n\r\n',
            'latin1'
          )
        );
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as net.AddressInfo;

    const timeline: any[] = [];
    const agent = getOrCreateHttpAgent({
      AgentClass: http.Agent,
      options: { keepAlive: false },
      timeline,
      disableCache: true
    });

    try {
      const response = await axios.get(`http://127.0.0.1:${port}/`, {
        httpAgent: agent,
        proxy: false,
        responseType: 'text',
        transformResponse: [(d) => d]
      });

      expect(response.status).toBe(200);
      expect(response.data).toBe('hello world');
      expect(timeline.some((e) => e.type === 'info' && /Trying/.test(e.message))).toBe(true);
    } finally {
      agent.destroy();
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });
});
