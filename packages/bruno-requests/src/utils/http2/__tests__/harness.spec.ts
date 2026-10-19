import { startH2Server, startH1Server, h2Request, h1Request, TestServer } from './helpers/h2-server';

describe('http2 test harness', () => {
  let dual: TestServer;
  let h1only: TestServer;

  beforeAll(async () => {
    dual = await startH2Server();
    h1only = await startH1Server();
  });

  afterAll(async () => {
    await dual.close();
    await h1only.close();
  });

  it('dual server answers an HTTP/2 client over ALPN h2', async () => {
    const res = await h2Request(dual.url, '/echo');
    expect(res.status).toBe(200);
    expect(res.alpn).toBe('h2');
    expect(JSON.parse(res.body).protocol).toBe('2.0');
  });

  it('dual server also answers an HTTP/1.1 client', async () => {
    const res = await h1Request(dual.url, '/echo');
    expect(res.status).toBe(200);
    expect(res.httpVersion).toBe('1.1');
    expect(JSON.parse(res.body).protocol).toBe('1.1');
  });

  it('h1-only server serves HTTP/1.1', async () => {
    const res = await h1Request(h1only.url, '/echo');
    expect(res.status).toBe(200);
    expect(res.alpn).toBe('http/1.1');
    expect(JSON.parse(res.body).protocol).toBe('1.1');
  });

  it('h1-only server refuses an HTTP/2 (ALPN h2) client', async () => {
    await expect(h2Request(h1only.url, '/echo')).rejects.toThrow();
  });

  it('echoes a request body and method', async () => {
    const res = await h2Request(dual.url, '/echo', { method: 'POST', body: 'hello' });
    const j = JSON.parse(res.body);
    expect(j.method).toBe('POST');
    expect(j.body).toBe('hello');
  });
});
