import http from 'node:http';
import net, { type AddressInfo } from 'node:net';
import axios from 'axios';
import { getOrCreateHttpAgent, clearAgentCache } from '../utils/agent-cache';

const BOTH_HEADERS = 'HTTP/1.1 200 OK\r\nContent-Length: 3\r\nTransfer-Encoding: chunked\r\n\r\n5\r\nhello\r\n0\r\n\r\n';
const CHUNKED_ONLY = 'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n5\r\nhello\r\n0\r\n\r\n';

type RawServer = { url: string; close: () => Promise<void> };

// Replies with raw bytes so the response can break HTTP rules a real server library would refuse to send
const startRawServer = (respond: (path: string) => string): Promise<RawServer> => new Promise((resolve) => {
  const server = net.createServer((socket) => {
    socket.once('data', (data) => {
      const path = data.toString('latin1').split(' ')[1];
      socket.end(respond(path));
    });
  });
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address() as AddressInfo;
    resolve({
      url: `http://127.0.0.1:${port}`,
      close: () => new Promise<void>((done) => server.close(() => done()))
    });
  });
});

type Result = { body?: string; headers?: http.IncomingHttpHeaders; errorCode?: string };

const get = (url: string, agent: http.Agent): Promise<Result> => new Promise((resolve) => {
  http.get(url, { agent }, (res) => {
    let body = '';
    res.setEncoding('latin1');
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => resolve({ body, headers: res.headers }));
  }).on('error', (err: Error & { code?: string }) => resolve({ errorCode: err.code }));
});

const cachedAgent = (disableCache = false) =>
  getOrCreateHttpAgent({ AgentClass: http.Agent, options: { keepAlive: false }, timeline: null, disableCache }) as http.Agent;

describe('responses with both Content-Length and Transfer-Encoding', () => {
  let server: RawServer;

  afterEach(async () => {
    clearAgentCache();
    await server?.close();
  });

  it('runs on a Node version that has the parser internals the fix relies on', () => {
    const { HTTPParser } = require('_http_common');
    expect(typeof HTTPParser.kLenientChunkedLength).toBe('number');
    expect(typeof HTTPParser.prototype.initialize).toBe('function');
  });

  it('reads the chunked body and keeps Content-Length in the headers', async () => {
    server = await startRawServer(() => BOTH_HEADERS);
    const result = await get(server.url, cachedAgent());
    expect(result.errorCode).toBeUndefined();
    expect(result.body).toBe('hello');
    expect(result.headers?.['content-length']).toBe('3');
    expect(result.headers?.['transfer-encoding']).toBe('chunked');
  });

  it('returns the whole chunked body when Content-Length is larger than it', async () => {
    server = await startRawServer(() => BOTH_HEADERS.replace('Content-Length: 3', 'Content-Length: 100'));
    const result = await get(server.url, cachedAgent());
    expect(result.body).toBe('hello');
  });

  it('works for agents built with the cache disabled', async () => {
    server = await startRawServer(() => BOTH_HEADERS);
    const result = await get(server.url, cachedAgent(true));
    expect(result.body).toBe('hello');
  });

  it('shows no Content-Length once the server is fixed', async () => {
    let fixed = false;
    server = await startRawServer(() => (fixed ? CHUNKED_ONLY : BOTH_HEADERS));
    const agent = cachedAgent();

    expect((await get(server.url, agent)).headers?.['content-length']).toBe('3');
    fixed = true;
    const after = await get(server.url, agent);
    expect(after.body).toBe('hello');
    expect(after.headers?.['content-length']).toBeUndefined();
  });

  it('reads the response after a redirect followed by axios', async () => {
    server = await startRawServer((path) => (path === '/start'
      ? 'HTTP/1.1 302 Found\r\nLocation: /end\r\nContent-Length: 0\r\n\r\n'
      : BOTH_HEADERS));
    const response = await axios.get(`${server.url}/start`, { httpAgent: cachedAgent(), maxRedirects: 5, responseType: 'text' });
    expect(response.data).toBe('hello');
    expect(response.request.path).toBe('/end');
  });

  it('still rejects the response on agents that did not come from the cache', async () => {
    server = await startRawServer(() => BOTH_HEADERS);
    const result = await get(server.url, new http.Agent({ keepAlive: false }));
    expect(result.errorCode).toBe('HPE_INVALID_TRANSFER_ENCODING');
  });
});
