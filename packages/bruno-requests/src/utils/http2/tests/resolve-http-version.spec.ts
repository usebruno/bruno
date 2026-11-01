import { resolveHttpVersion } from '../resolve-http-version';

describe('resolveHttpVersion (collection > app precedence)', () => {
  it('uses the collection value when it is a concrete mode', () => {
    expect(resolveHttpVersion('http2', 'http1')).toBe('http2');
    expect(resolveHttpVersion('auto', 'http1')).toBe('auto');
    expect(resolveHttpVersion('http1', 'auto')).toBe('http1');
  });

  it('defers to the fallback when the collection value is "inherit"', () => {
    expect(resolveHttpVersion('inherit', 'auto')).toBe('auto');
    expect(resolveHttpVersion('inherit', 'http2')).toBe('http2');
  });

  it('defers to the fallback when the collection value is unset', () => {
    expect(resolveHttpVersion(undefined, 'auto')).toBe('auto');
    expect(resolveHttpVersion(null, 'http2')).toBe('http2');
    expect(resolveHttpVersion('', 'http1')).toBe('http1');
  });

  it('defaults to http1 when neither is set', () => {
    expect(resolveHttpVersion()).toBe('http1');
    expect(resolveHttpVersion('inherit')).toBe('http1');
    expect(resolveHttpVersion(null, null)).toBe('http1');
  });

  it('ignores unknown values', () => {
    expect(resolveHttpVersion('http3', 'auto')).toBe('auto');
    expect(resolveHttpVersion('http3', 'h2')).toBe('http1');
  });
});
