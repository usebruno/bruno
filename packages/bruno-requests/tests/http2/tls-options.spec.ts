import { pickTlsFields, TLS_FIELDS, wrapLookup } from '../../src/http2/tls-options';

describe('pickTlsFields', () => {
  test('returns an empty object for null/undefined input', () => {
    expect(pickTlsFields(undefined)).toEqual({});
    expect(pickTlsFields(null)).toEqual({});
  });

  test('copies only TLS fields and drops https.Agent-only options', () => {
    const picked = pickTlsFields({
      ca: 'CA',
      cert: 'CERT',
      key: 'KEY',
      rejectUnauthorized: false,
      keepAlive: true,
      maxSockets: 5,
      timeout: 1000
    });
    expect(picked).toEqual({ ca: 'CA', cert: 'CERT', key: 'KEY', rejectUnauthorized: false });
  });

  test('drops fields that are explicitly undefined', () => {
    expect(pickTlsFields({ ca: undefined, passphrase: 'pw' })).toEqual({ passphrase: 'pw' });
  });

  test('every listed field is forwarded', () => {
    const input = Object.fromEntries(TLS_FIELDS.map((f) => [f, `v-${f}`]));
    expect(pickTlsFields(input)).toEqual(input);
  });
});

describe('wrapLookup', () => {
  const single = (_h: string, _o: any, cb: any) => cb(null, '127.0.0.1', 4);

  test('adapts a single address to the array form when all:true (autoSelectFamily)', (done) => {
    wrapLookup(single as any)('localhost', { all: true }, (err: any, addresses: any) => {
      expect(err).toBeNull();
      expect(addresses).toEqual([{ address: '127.0.0.1', family: 4 }]);
      done();
    });
  });

  test('passes a single address through when all is not set', (done) => {
    wrapLookup(single as any)('localhost', {}, (err: any, address: any, family: any) => {
      expect(err).toBeNull();
      expect(address).toBe('127.0.0.1');
      expect(family).toBe(4);
      done();
    });
  });

  test('passes an already-array result through untouched', (done) => {
    const arr = (_h: string, _o: any, cb: any) => cb(null, [{ address: '::1', family: 6 }]);
    wrapLookup(arr as any)('localhost', { all: true }, (err: any, addresses: any) => {
      expect(addresses).toEqual([{ address: '::1', family: 6 }]);
      done();
    });
  });

  test('forwards errors', (done) => {
    const fail = (_h: string, _o: any, cb: any) => cb(new Error('boom'));
    wrapLookup(fail as any)('localhost', { all: true }, (err: any) => {
      expect(err?.message).toBe('boom');
      done();
    });
  });
});
