const net = require('net');
const axios = require('axios');
const {
  applyInvalidHeaderToleranceToRequest,
  normalizeObsFoldedResponseHeaders
} = require('../../src/ipc/network/invalid-header-tolerance');

const startRawHttpServer = async (rawResponse) => {
  const server = net.createServer((socket) => {
    socket.once('data', () => {
      socket.end(rawResponse);
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
};

const buildRawResponse = ({ headers = {}, body = '' }) => {
  const bodyBuf = Buffer.from(body, 'utf8');
  const headerLines = Object.entries({
    Connection: 'close',
    'Content-Length': String(bodyBuf.length),
    ...headers
  }).map(([k, v]) => `${k}: ${v}`);

  return [
    'HTTP/1.1 200 OK',
    ...headerLines,
    '',
    bodyBuf.toString('utf8')
  ].join('\r\n');
};

describe('HTTP response header tolerance (obs-fold)', () => {
  const originalEnv = process.env.BRUNO_ALLOW_INVALID_HEADERS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.BRUNO_ALLOW_INVALID_HEADERS;
    } else {
      process.env.BRUNO_ALLOW_INVALID_HEADERS = originalEnv;
    }
  });

  it('does not modify normal headers', async () => {
    process.env.BRUNO_ALLOW_INVALID_HEADERS = '1';

    const body = JSON.stringify({ ok: true });
    const { url, close } = await startRawHttpServer(buildRawResponse({
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': 'a, b, c'
      },
      body
    }));

    try {
      const request = { method: 'GET', url, settings: {} };
      applyInvalidHeaderToleranceToRequest(request);
      const response = await axios({ ...request, responseType: 'text' });
      normalizeObsFoldedResponseHeaders(response.headers, request);

      expect(response.data).toBe(body);
      expect(response.headers['access-control-allow-headers']).toBe('a, b, c');
    } finally {
      await close();
    }
  });

  it('parses and merges obs-fold continuation lines', async () => {
    process.env.BRUNO_ALLOW_INVALID_HEADERS = '1';

    const body = JSON.stringify({ ok: true });
    const raw = [
      'HTTP/1.1 200 OK',
      'Connection: close',
      'Content-Type: application/json',
      `Content-Length: ${Buffer.byteLength(body, 'utf8')}`,
      'Access-Control-Allow-Headers: a, b,',
      '  c',
      '',
      body
    ].join('\r\n');

    const { url, close } = await startRawHttpServer(raw);

    try {
      const request = { method: 'GET', url, settings: {} };
      applyInvalidHeaderToleranceToRequest(request);
      const response = await axios({ ...request, responseType: 'text' });
      normalizeObsFoldedResponseHeaders(response.headers, request);

      expect(response.data).toBe(body);
      expect(response.headers['access-control-allow-headers']).toBe('a, b, c');
    } finally {
      await close();
    }
  });

  it('treats folded \"Accept:\" as continuation (does not fail)', async () => {
    process.env.BRUNO_ALLOW_INVALID_HEADERS = '1';

    const body = JSON.stringify({ ok: true });
    const raw = [
      'HTTP/1.1 200 OK',
      'Connection: close',
      'Content-Type: application/json',
      `Content-Length: ${Buffer.byteLength(body, 'utf8')}`,
      'Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type,',
      '       Accept:',
      '',
      body
    ].join('\r\n');

    const { url, close } = await startRawHttpServer(raw);

    try {
      const request = { method: 'GET', url, settings: {} };
      applyInvalidHeaderToleranceToRequest(request);
      const response = await axios({ ...request, responseType: 'text' });
      normalizeObsFoldedResponseHeaders(response.headers, request);

      expect(response.data).toBe(body);
      expect(response.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept');
    } finally {
      await close();
    }
  });

  it('can be disabled via BRUNO_ALLOW_INVALID_HEADERS=0', async () => {
    process.env.BRUNO_ALLOW_INVALID_HEADERS = '0';

    const body = JSON.stringify({ ok: true });
    const raw = [
      'HTTP/1.1 200 OK',
      'Connection: close',
      'Content-Type: application/json',
      `Content-Length: ${Buffer.byteLength(body, 'utf8')}`,
      'Access-Control-Allow-Headers: a, b,',
      '  c',
      '',
      body
    ].join('\r\n');

    const { url, close } = await startRawHttpServer(raw);

    try {
      const request = { method: 'GET', url, settings: {} };
      applyInvalidHeaderToleranceToRequest(request);

      await expect(axios({ ...request, responseType: 'text' })).rejects.toMatchObject({
        code: 'HPE_INVALID_HEADER_TOKEN'
      });
    } finally {
      await close();
    }
  });
});

