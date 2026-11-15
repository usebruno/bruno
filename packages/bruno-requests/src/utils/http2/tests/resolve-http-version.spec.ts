import { resolveHttpVersion } from '../resolve-http-version';

describe('resolveHttpVersion (request > collection > app precedence)', () => {
  it('uses the request value when it is a concrete mode', () => {
    expect(resolveHttpVersion('http2', 'http1', 'http1')).toBe('http2');
    expect(resolveHttpVersion('auto', 'http1', 'http1')).toBe('auto');
    expect(resolveHttpVersion('http1', 'http2', 'auto')).toBe('http1');
  });

  it('defers to the collection when the request value is inherit/unset', () => {
    expect(resolveHttpVersion('inherit', 'http2', 'http1')).toBe('http2');
    expect(resolveHttpVersion(undefined, 'auto', 'http1')).toBe('auto');
    expect(resolveHttpVersion(null, 'http1', 'http2')).toBe('http1');
  });

  it('defers to the app fallback when request and collection are inherit/unset', () => {
    expect(resolveHttpVersion('inherit', 'inherit', 'auto')).toBe('auto');
    expect(resolveHttpVersion(undefined, undefined, 'http2')).toBe('http2');
    expect(resolveHttpVersion(null, '', 'http1')).toBe('http1');
  });

  it('defaults to http1 when nothing concrete is set', () => {
    expect(resolveHttpVersion()).toBe('http1');
    expect(resolveHttpVersion('inherit', 'inherit')).toBe('http1');
    expect(resolveHttpVersion(null, null, null)).toBe('http1');
  });

  it('ignores unknown values at each level', () => {
    expect(resolveHttpVersion('http3', 'auto', 'http1')).toBe('auto');
    expect(resolveHttpVersion('http3', 'h2', 'http2')).toBe('http2');
    expect(resolveHttpVersion('http3', 'h2', 'bogus')).toBe('http1');
  });
});
