import { pickTlsFields, buildTlsConnectOptions, ALPN_BY_MODE, stripIpv6Brackets, wrapLookup, TLS_FIELDS, bracketIpv6 } from './tls-connect-options';

describe('ALPN_BY_MODE', () => {
  it('offers both for auto, h2 for http2, http/1.1 for http1', () => {
    expect(ALPN_BY_MODE['auto']).toEqual(['h2', 'http/1.1']);
    expect(ALPN_BY_MODE['http2']).toEqual(['h2']);
    expect(ALPN_BY_MODE['http1']).toEqual(['http/1.1']);
  });
});

describe('pickTlsFields', () => {
  it('keeps only TLS fields and drops agent/proxy fields', () => {
    const picked = pickTlsFields({ ca: 'CA', cert: 'C', key: 'K', rejectUnauthorized: false, keepAlive: true, proxy: {}, caCertificatesCount: 3, lookup: () => {} } as any);
    expect(picked).toEqual({ ca: 'CA', cert: 'C', key: 'K', rejectUnauthorized: false });
    for (const k of ['keepAlive', 'proxy', 'caCertificatesCount', 'lookup']) expect(k in picked).toBe(false);
  });

  it('returns an empty object for nullish input', () => {
    expect(pickTlsFields(undefined)).toEqual({});
  });

  it('TLS_FIELDS includes the full client-cert + verification set', () => {
    expect(TLS_FIELDS).toEqual(expect.arrayContaining(['ca', 'cert', 'key', 'pfx', 'passphrase', 'rejectUnauthorized', 'secureContext']));
  });
});

describe('stripIpv6Brackets', () => {
  it('removes surrounding brackets only', () => {
    expect(stripIpv6Brackets('[::1]')).toBe('::1');
    expect(stripIpv6Brackets('[2001:db8::1]')).toBe('2001:db8::1');
    expect(stripIpv6Brackets('example.com')).toBe('example.com');
    expect(stripIpv6Brackets('127.0.0.1')).toBe('127.0.0.1');
  });
});

describe('buildTlsConnectOptions', () => {
  it('sets host/servername/port and defaults rejectUnauthorized to true', () => {
    const opts = buildTlsConnectOptions({ hostname: 'api.test', port: 8443, mode: 'http2' });
    expect(opts.host).toBe('api.test');
    expect(opts.servername).toBe('api.test');
    expect(opts.port).toBe(8443);
    expect(opts.rejectUnauthorized).toBe(true);
  });

  it('uses the bare address for an IPv6 host on both host and servername', () => {
    const opts = buildTlsConnectOptions({ hostname: '[::1]', port: 8443, mode: 'http2' });
    expect(opts.host).toBe('::1');
    expect(opts.servername).toBe('::1');
  });

  it('offers ALPN per mode', () => {
    expect(buildTlsConnectOptions({ hostname: 'x.test', mode: 'http2' }).ALPNProtocols).toEqual(['h2']);
    expect(buildTlsConnectOptions({ hostname: 'x.test', mode: 'auto' }).ALPNProtocols).toEqual(['h2', 'http/1.1']);
    expect(buildTlsConnectOptions({ hostname: 'x.test', mode: 'http1' }).ALPNProtocols).toEqual(['http/1.1']);
  });

  it('honours an explicit rejectUnauthorized: false', () => {
    expect(buildTlsConnectOptions({ hostname: 'x.test', mode: 'http2', tlsOptions: { rejectUnauthorized: false } }).rejectUnauthorized).toBe(false);
  });

  it('throws on an unknown mode', () => {
    expect(() => buildTlsConnectOptions({ hostname: 'x.test', mode: 'h3' as any })).toThrow(/unknown mode/);
  });

  it('wraps the lookup so { all: true } callers get an array', () => {
    const raw = ((_h: string, _o: any, cb: any) => cb(null, '::1', 6)) as any;
    const opts = buildTlsConnectOptions({ hostname: 'x.test', mode: 'http2', lookup: raw });
    (opts.lookup as any)('x.test', { all: true }, (_e: any, addr: any) => expect(addr).toEqual([{ address: '::1', family: 6 }]));
  });
});

describe('wrapLookup', () => {
  it('passes an error straight through', () => {
    const raw = ((_h: string, _o: any, cb: any) => cb(new Error('dns fail'))) as any;
    wrapLookup(raw)('x.test', { all: true } as any, (err: any) => expect(err).toBeInstanceOf(Error));
  });

  it('leaves a non-all lookup as (address, family)', () => {
    const raw = ((_h: string, _o: any, cb: any) => cb(null, '1.2.3.4', 4)) as any;
    wrapLookup(raw)('x.test', {} as any, (_e: any, addr: any, fam: any) => {
      expect(addr).toBe('1.2.3.4'); expect(fam).toBe(4);
    });
  });
});

describe('bracketIpv6', () => {
  it('wraps a bare IPv6 literal and leaves other hosts (and already-bracketed ones) untouched', () => {
    expect(bracketIpv6('::1')).toBe('[::1]');
    expect(bracketIpv6('2001:db8::1')).toBe('[2001:db8::1]');
    expect(bracketIpv6('[::1]')).toBe('[::1]');
    expect(bracketIpv6('api.test')).toBe('api.test');
    expect(bracketIpv6('127.0.0.1')).toBe('127.0.0.1');
  });
});
