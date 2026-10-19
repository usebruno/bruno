import { resolveHttpVersion, negotiateHttpVersion, clearAlpnCache } from '../alpn';
import { startH2Server, startH1Server, TestServer } from './helpers/h2-server';
import { cert } from './helpers/certs';

describe('alpn resolver', () => {
  let dual: TestServer;
  let h1only: TestServer;
  const tlsOptions = { ca: cert };

  beforeAll(async () => {
    dual = await startH2Server();
    h1only = await startH1Server();
  });
  afterAll(async () => {
    await dual.close();
    await h1only.close();
  });
  beforeEach(() => clearAlpnCache());

  const port = (s: TestServer) => s.port;

  describe('negotiateHttpVersion', () => {
    it('negotiates h2 against a dual server', async () => {
      expect((await negotiateHttpVersion({ hostname: 'localhost', port: port(dual), tlsOptions })).alpn).toBe('h2');
    });
    it('negotiates http/1.1 against an h1-only server', async () => {
      expect((await negotiateHttpVersion({ hostname: 'localhost', port: port(h1only), tlsOptions })).alpn).toBe('http/1.1');
    });
    it('returns an error (never hangs) for a dead port', async () => {
      const r = await negotiateHttpVersion({ hostname: 'localhost', port: 1, tlsOptions });
      expect(r.alpn).toBeNull();
      expect(r.error).toBeTruthy();
    }, 15000);
  });

  describe('resolveHttpVersion', () => {
    it('forces h2 for mode http2 without probing', async () => {
      const r = await resolveHttpVersion({ url: 'https://localhost:9/x', mode: 'http2', tlsOptions });
      expect(r.httpVersion).toBe(2);
      expect(r.reason).toBe('mode http2');
    });
    it('returns h1 for mode http1.1 and for cleartext urls', async () => {
      expect((await resolveHttpVersion({ url: 'https://localhost:9/x', mode: 'http1.1', tlsOptions })).httpVersion).toBe(1);
      expect((await resolveHttpVersion({ url: 'http://localhost:9/x', mode: 'auto', tlsOptions })).httpVersion).toBe(1);
    });
    it('auto negotiates h2 on the dual server and h1 on the h1-only server', async () => {
      const d = await resolveHttpVersion({ url: `https://localhost:${port(dual)}/x`, mode: 'auto', tlsOptions });
      expect(d.httpVersion).toBe(2);
      expect(d.alpn).toBe('h2');
      const h = await resolveHttpVersion({ url: `https://localhost:${port(h1only)}/x`, mode: 'auto', tlsOptions });
      expect(h.httpVersion).toBe(1);
      expect(h.alpn).toBe('http/1.1');
    });
    it('serves the cached result on the second auto call', async () => {
      const url = `https://localhost:${port(dual)}/x`;
      await resolveHttpVersion({ url, mode: 'auto', tlsOptions });
      const second = await resolveHttpVersion({ url, mode: 'auto', tlsOptions });
      expect(second.reason).toBe('auto (cached)');
      expect(second.httpVersion).toBe(2);
    });
  });
});
