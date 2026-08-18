import { getBodyType, isBinaryContentType } from './responseBodyProcessor';

describe('getBodyType', () => {
  it('maps textual content types', () => {
    expect(getBodyType('application/json')).toBe('json');
    expect(getBodyType('application/json; charset=utf-8')).toBe('json');
    expect(getBodyType('text/xml')).toBe('xml');
    expect(getBodyType('application/xml')).toBe('xml');
    expect(getBodyType('text/html')).toBe('html');
    expect(getBodyType('text/plain')).toBe('text');
    expect(getBodyType('')).toBe('text');
    expect(getBodyType()).toBe('text');
  });

  it('maps binary media content types to binary', () => {
    expect(getBodyType('image/png')).toBe('binary');
    expect(getBodyType('image/jpeg; charset=binary')).toBe('binary');
    expect(getBodyType('audio/mpeg')).toBe('binary');
    expect(getBodyType('video/mp4')).toBe('binary');
    expect(getBodyType('application/pdf')).toBe('binary');
    expect(getBodyType('application/octet-stream')).toBe('binary');
  });

  it('keeps SVG as text, not binary', () => {
    expect(getBodyType('image/svg+xml')).toBe('text');
  });
});

describe('isBinaryContentType', () => {
  it('recognizes binary media and rejects text types', () => {
    expect(isBinaryContentType('image/webp')).toBe(true);
    expect(isBinaryContentType('video/webm')).toBe(true);
    expect(isBinaryContentType('application/pdf')).toBe(true);
    expect(isBinaryContentType('image/svg+xml')).toBe(false);
    expect(isBinaryContentType('application/json')).toBe(false);
    expect(isBinaryContentType('')).toBe(false);
  });
});
