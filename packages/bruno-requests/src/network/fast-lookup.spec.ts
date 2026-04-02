import dns from 'node:dns';
import { fastLookup } from './fast-lookup';

type DnsMethod = 'resolve4' | 'resolve6';

function mockResolve(method: DnsMethod, result: string[], err: Error | null = null): void {
  (jest.spyOn(dns, method) as any).mockImplementation((_hostname: string, cb: Function) => {
    cb(err, result);
  });
}

function mockLookup(address: string, family: number): void {
  (jest.spyOn(dns, 'lookup') as any).mockImplementation((_hostname: string, _options: dns.LookupOptions, cb: Function) => {
    cb(null, address, family);
  });
}

describe('fastLookup', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should resolve a public hostname via dns.resolve4', (done) => {
    mockResolve('resolve4', ['93.184.216.34']);

    fastLookup('example.com', {}, (err, address, family) => {
      expect(err).toBeNull();
      expect(address).toBe('93.184.216.34');
      expect(family).toBe(4);
      done();
    });
  });

  it('should try resolve6 when resolve4 fails', (done) => {
    mockResolve('resolve4', [], new Error('ENOTFOUND'));
    mockResolve('resolve6', ['::1']);

    fastLookup('ipv6only.example.com', {}, (err, address, family) => {
      expect(err).toBeNull();
      expect(address).toBe('::1');
      expect(family).toBe(6);
      done();
    });
  });

  it('should fall back to dns.lookup when both resolvers fail', (done) => {
    mockResolve('resolve4', [], new Error('ENOTFOUND'));
    mockResolve('resolve6', [], new Error('ENOTFOUND'));
    mockLookup('127.0.0.1', 4);

    fastLookup('my-local-host', {}, (err, address, family) => {
      expect(err).toBeNull();
      expect(address).toBe('127.0.0.1');
      expect(family).toBe(4);
      done();
    });
  });

  it('should return all addresses when options.all is true', (done) => {
    mockResolve('resolve4', ['1.2.3.4', '5.6.7.8']);

    fastLookup('example.com', { all: true }, (err, addresses) => {
      expect(err).toBeNull();
      expect(Array.isArray(addresses)).toBe(true);
      expect(addresses).toEqual([
        { address: '1.2.3.4', family: 4 },
        { address: '5.6.7.8', family: 4 }
      ]);
      done();
    });
  });
});
