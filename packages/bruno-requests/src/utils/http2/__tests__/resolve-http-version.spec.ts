import { resolveHttpVersion, HTTP_VERSION_VALUES } from '../resolve-http-version';

describe('resolveHttpVersion', () => {
  it('exposes the supported values', () => {
    expect(HTTP_VERSION_VALUES).toEqual(['auto', 'http1.1', 'http2']);
  });

  it('collection-level setting wins over the fallback', () => {
    expect(resolveHttpVersion('http2', 'http1.1')).toBe('http2');
    expect(resolveHttpVersion('auto', 'http1.1')).toBe('auto');
  });

  it('falls back to the global level when the collection inherits/omits', () => {
    expect(resolveHttpVersion('inherit', 'http2')).toBe('http2');
    expect(resolveHttpVersion(undefined, 'auto')).toBe('auto');
    expect(resolveHttpVersion(null, 'http2')).toBe('http2');
  });

  it('defaults to http1.1 when nothing specifies a version', () => {
    expect(resolveHttpVersion(undefined, undefined)).toBe('http1.1');
    expect(resolveHttpVersion(null, '')).toBe('http1.1');
    expect(resolveHttpVersion('inherit', null)).toBe('http1.1');
  });
});
