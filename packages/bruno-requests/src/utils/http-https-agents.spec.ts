import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { HeaderSafeHttpProxyAgent, getHttpHttpsAgents } from './http-https-agents';

const HEADER_END = '\r\n\r\n';

type CapturedRequest = {
  raw: string;
  requestLineCount: number;
  contentLength: number;
  body: string;
};

const parseCaptured = (raw: string, requestLine: RegExp): CapturedRequest => {
  const headerEnd = raw.indexOf(HEADER_END);
  const headerBlock = raw.slice(0, headerEnd);
  const contentLengthMatch = headerBlock.match(/^content-length:\s*(\d+)/im);
  return {
    raw,
    requestLineCount: (raw.match(requestLine) || []).length,
    contentLength: contentLengthMatch ? Number(contentLengthMatch[1]) : 0,
    body: raw.slice(headerEnd + HEADER_END.length)
  };
};

/**
 * Minimal forward proxy that records every byte it receives on a connection and
 * answers once the declared body has arrived. The capture resolves when the
 * connection closes, so trailing bytes (e.g. a duplicated header) are included.
 */
const startCapturingProxy = async () => {
  const captures: Promise<string>[] = [];
  const server = net.createServer((socket) => {
    captures.push(new Promise((resolve) => {
      let raw = '';
      let responded = false;
      socket.on('data', (chunk) => {
        raw += chunk.toString('latin1');
        const headerEnd = raw.indexOf(HEADER_END);
        if (responded || headerEnd === -1) {
          return;
        }
        const contentLengthMatch = raw.slice(0, headerEnd).match(/^content-length:\s*(\d+)/im);
        const contentLength = contentLengthMatch ? Number(contentLengthMatch[1]) : 0;
        if (raw.length - (headerEnd + HEADER_END.length) >= contentLength) {
          responded = true;
          setTimeout(() => {
            socket.end('HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok');
          }, 20);
        }
      });
      socket.on('error', () => {});
      socket.on('close', () => resolve(raw));
    }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const proxyUrl = `http://127.0.0.1:${(server.address() as net.AddressInfo).port}`;
  const close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  return { proxyUrl, captures, close };
};

describe('HeaderSafeHttpProxyAgent', () => {
  let proxy: Awaited<ReturnType<typeof startCapturingProxy>>;
  let agent: http.Agent | undefined;

  beforeEach(async () => {
    proxy = await startCapturingProxy();
    agent = undefined;
  });

  afterEach(async () => {
    agent?.destroy();
    await proxy.close();
  });

  const postLine = /^POST http:\/\/example\.test\/upload HTTP\/1\.1\r\n/gm;

  it('sends the header once when body chunks are written before and after the proxy connection', async () => {
    agent = new HeaderSafeHttpProxyAgent(proxy.proxyUrl, { keepAlive: true });
    const chunkA = 'first-part-written-synchronously;';
    const chunkB = 'second-part-written-after-connect';

    const responseBody = await new Promise<string>((resolve, reject) => {
      const req = http.request({
        host: 'example.test',
        port: 80,
        path: '/upload',
        method: 'POST',
        agent,
        headers: { 'Content-Length': chunkA.length + chunkB.length }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.write(chunkA);
      setImmediate(() => {
        req.write(chunkB);
        req.end();
      });
    });

    expect(responseBody).toBe('ok');
    const captured = parseCaptured(await proxy.captures[0], postLine);
    expect(captured.requestLineCount).toBe(1);
    expect(captured.body).toBe(chunkA + chunkB);
    expect(captured.body.length).toBe(captured.contentLength);
  });

  it('still sends the header when the body is written only after the proxy connection', async () => {
    agent = new HeaderSafeHttpProxyAgent(proxy.proxyUrl, { keepAlive: true });
    const body = 'whole-body-written-after-connect';

    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = http.request({
        host: 'example.test',
        port: 80,
        path: '/upload',
        method: 'POST',
        agent,
        headers: { 'Content-Length': body.length }
      }, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      // 'socket' fires after connect() has run, so nothing is buffered when it does
      req.on('socket', () => setImmediate(() => req.end(body)));
    });

    expect(status).toBe(200);
    const captured = parseCaptured(await proxy.captures[0], postLine);
    expect(captured.requestLineCount).toBe(1);
    expect(captured.body).toBe(body);
    expect(captured.body.length).toBe(captured.contentLength);
  });

  it.each([
    ['manual', { collectionLevelProxy: { inherit: false, config: { protocol: 'http', hostname: '127.0.0.1', port: 8080, auth: { disabled: true } } } }],
    ['system', { systemProxyConfig: { http_proxy: 'http://127.0.0.1:8080' } }]
  ])('uses HeaderSafeHttpProxyAgent for http:// requests in %s proxy mode', async (_mode, proxySettings) => {
    const { httpAgent } = await getHttpHttpsAgents({
      requestUrl: 'http://example.test/upload',
      collectionPath: os.tmpdir(),
      options: {
        noproxy: false,
        shouldVerifyTls: false,
        shouldUseCustomCaCertificate: false,
        shouldKeepDefaultCaCertificates: true
      },
      ...proxySettings
    });
    agent = httpAgent;
    expect(httpAgent).toBeInstanceOf(HeaderSafeHttpProxyAgent);
  });

  it('sends a multipart body with a file stream intact through the system http proxy agent', async () => {
    const axios = require('axios');
    const FormData = require('form-data');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-http-proxy-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    fs.writeFileSync(filePath, 'hello world');

    try {
      const { httpAgent } = await getHttpHttpsAgents({
        requestUrl: 'http://example.test/upload',
        collectionPath: tmpDir,
        options: {
          noproxy: false,
          shouldVerifyTls: false,
          shouldUseCustomCaCertificate: false,
          shouldKeepDefaultCaCertificates: true
        },
        systemProxyConfig: { http_proxy: proxy.proxyUrl },
        timeline: []
      });
      agent = httpAgent;
      expect(httpAgent).toBeInstanceOf(HeaderSafeHttpProxyAgent);

      const form = new FormData();
      form.append('name', 'bruno');
      form.append('file', fs.createReadStream(filePath));

      const response = await axios.post('http://example.test/upload', form, {
        httpAgent,
        proxy: false,
        headers: form.getHeaders()
      });

      expect(response.status).toBe(200);
      const captured = parseCaptured(await proxy.captures[0], postLine);
      expect(captured.requestLineCount).toBe(1);
      expect(captured.contentLength).toBeGreaterThan(0);
      expect(captured.body.length).toBe(captured.contentLength);
      expect(captured.body).toContain('name="name"\r\n\r\nbruno\r\n');
      expect(captured.body).toContain('filename="sample.txt"');
      expect(captured.body).toContain('hello world');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
