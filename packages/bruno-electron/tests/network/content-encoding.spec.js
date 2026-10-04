jest.mock('electron', () => ({ app: { getVersion: () => '1.0.0' } }));
jest.mock('../../src/store/preferences', () => ({
  preferencesUtil: {
    shouldStoreCookies: () => false,
    shouldSendCookies: () => false,
    isSslSessionCachingEnabled: () => true
  }
}));
jest.mock('../../src/utils/cookies', () => ({ addCookieToJar: jest.fn(), getCookieStringForUrl: jest.fn() }));
jest.mock('../../src/utils/proxy-util', () => ({ setupProxyAgents: jest.fn() }));
jest.mock('../../src/utils/form-data', () => ({ createFormData: jest.fn() }));

const http = require('http');
const zlib = require('zlib');
const { makeAxiosInstance } = require('../../src/ipc/network/axios-instance');

describe('axios-instance: content-encoding', () => {
  let server;
  let url;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      const body = zlib.gzipSync(JSON.stringify({ ok: true }));
      const status = req.url === '/missing' ? 404 : 200;
      res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', 'Content-Length': body.length });
      res.end(body);
    });
    server.listen(0, '127.0.0.1', () => {
      url = `http://127.0.0.1:${server.address().port}/`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test('keeps the content-encoding header after decompressing the body', async () => {
    const instance = makeAxiosInstance();
    const response = await instance({ url, method: 'get' });
    expect(response.data).toEqual({ ok: true });
    expect(response.headers['content-encoding']).toBe('gzip');
  });

  test('keeps the content-encoding header on an error response', async () => {
    const instance = makeAxiosInstance();
    const error = await instance({ url: `${url}missing`, method: 'get' }).catch((err) => err);
    expect(error.response.status).toBe(404);
    expect(error.response.headers['content-encoding']).toBe('gzip');
  });

  test('does not add content-encoding when the server did not send it', async () => {
    const plain = http.createServer((req, res) => res.end('plain'));
    await new Promise((resolve) => plain.listen(0, '127.0.0.1', resolve));
    const instance = makeAxiosInstance();
    const response = await instance({ url: `http://127.0.0.1:${plain.address().port}/`, method: 'get' });
    await new Promise((resolve) => plain.close(resolve));
    expect(response.headers['content-encoding']).toBeUndefined();
  });
});
