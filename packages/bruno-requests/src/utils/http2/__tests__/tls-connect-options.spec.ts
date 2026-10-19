import { buildTlsConnectOptions, pickTlsFields, ALPN_BY_MODE } from '../tls-connect-options';

describe('tls-connect-options', () => {
  describe('pickTlsFields', () => {
    it('keeps TLS fields and drops agent settings', () => {
      const picked = pickTlsFields({ ca: 'x', rejectUnauthorized: false, keepAlive: true, maxSockets: 5 });
      expect(picked).toEqual({ ca: 'x', rejectUnauthorized: false });
    });
    it('returns {} for nullish input', () => {
      expect(pickTlsFields(undefined)).toEqual({});
      expect(pickTlsFields(null)).toEqual({});
    });
  });

  describe('buildTlsConnectOptions', () => {
    it('offers both protocols in auto mode, only h2 in http2 mode', () => {
      expect(buildTlsConnectOptions({ hostname: 'localhost', port: 8443, mode: 'auto' }).ALPNProtocols).toEqual(['h2', 'http/1.1']);
      expect(buildTlsConnectOptions({ hostname: 'localhost', port: 8443, mode: 'http2' }).ALPNProtocols).toEqual(['h2']);
      expect(ALPN_BY_MODE['http1.1']).toEqual(['http/1.1']);
    });
    it('strips IPv6 brackets from host and servername', () => {
      const opts = buildTlsConnectOptions({ hostname: '[::1]', port: 8443, mode: 'auto' });
      expect(opts.host).toBe('::1');
      expect(opts.servername).toBe('::1');
    });
    it('defaults rejectUnauthorized to true, honours an explicit false', () => {
      expect(buildTlsConnectOptions({ hostname: 'h', port: 1, mode: 'auto' }).rejectUnauthorized).toBe(true);
      expect(
        buildTlsConnectOptions({ hostname: 'h', port: 1, mode: 'auto', tlsOptions: { rejectUnauthorized: false } }).rejectUnauthorized
      ).toBe(false);
    });
    it('wraps a provided lookup', () => {
      const lookup = jest.fn();
      expect(typeof buildTlsConnectOptions({ hostname: 'h', port: 1, mode: 'auto', lookup }).lookup).toBe('function');
    });
  });
});
