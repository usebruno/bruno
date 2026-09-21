import { getBodyType, getExampleBodyType, isBinaryContentType } from './responseBodyProcessor';

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

describe('getExampleBodyType', () => {
  it('keeps the structured header type when the sniff only sees generic text', () => {
    expect(getExampleBodyType('application/json', 'text/plain')).toBe('json');
    expect(getExampleBodyType('application/xml', 'text/plain')).toBe('xml');
    expect(getExampleBodyType('text/html', 'text/plain')).toBe('html');
  });

  it('lets a binary sniff override a mislabeled text header', () => {
    expect(getExampleBodyType('text/plain', 'image/png')).toBe('binary');
    expect(getExampleBodyType('application/json', 'application/pdf')).toBe('binary');
  });

  it('falls back to the header when the bytes are not recognized', () => {
    expect(getExampleBodyType('application/octet-stream', null)).toBe('binary');
    expect(getExampleBodyType('application/json', null)).toBe('json');
    expect(getExampleBodyType('', null)).toBe('text');
  });

  it('keeps SVG as text even though the sniff reports an image mime', () => {
    expect(getExampleBodyType('image/svg+xml', 'image/svg+xml')).toBe('text');
    expect(getExampleBodyType('text/plain', 'image/svg+xml')).toBe('text');
  });
});
