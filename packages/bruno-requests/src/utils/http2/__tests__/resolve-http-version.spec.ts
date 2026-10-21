import { resolveHttpVersion, HTTP_VERSION_VALUES } from '../resolve-http-version';

const req = (httpVersion?: string) => (httpVersion === undefined ? {} : { settings: { httpVersion } });

describe('resolveHttpVersion', () => {
  it('exposes the supported values', () => {
    expect(HTTP_VERSION_VALUES).toEqual(['auto', 'http1.1', 'http2']);
  });

  it('request-level setting wins over collection and fallback', () => {
    expect(resolveHttpVersion(req('http2'), 'http1.1', 'auto')).toBe('http2');
  });

  it('collection-level is used when the request inherits/omits', () => {
    expect(resolveHttpVersion(req('inherit'), 'http2', 'http1.1')).toBe('http2');
    expect(resolveHttpVersion(req(undefined), 'http2', 'http1.1')).toBe('http2');
  });

  it('falls back to the global level when request and collection inherit/omit', () => {
    expect(resolveHttpVersion(req('inherit'), 'inherit', 'http2')).toBe('http2');
    expect(resolveHttpVersion(req(undefined), undefined, 'auto')).toBe('auto');
  });

  it('defaults to http1.1 when nothing specifies a version', () => {
    expect(resolveHttpVersion(req(undefined), undefined, undefined)).toBe('http1.1');
    expect(resolveHttpVersion({}, null, '')).toBe('http1.1');
  });

  it('is safe when the request object is missing', () => {
    expect(resolveHttpVersion(undefined, undefined, 'http2')).toBe('http2');
    expect(resolveHttpVersion(null, 'http1.1', 'auto')).toBe('http1.1');
  });
});
