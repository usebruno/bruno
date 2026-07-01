import { getBodyType } from './responseBodyProcessor';

describe('getBodyType', () => {
  it('should identify binary previewable response types', () => {
    expect(getBodyType('image/png')).toBe('binary');
    expect(getBodyType('application/pdf; charset=binary')).toBe('binary');
    expect(getBodyType('audio/mpeg')).toBe('binary');
    expect(getBodyType('video/mp4')).toBe('binary');
  });

  it('should keep text and structured response types unchanged', () => {
    expect(getBodyType('application/json')).toBe('json');
    expect(getBodyType('application/xml')).toBe('xml');
    expect(getBodyType('text/html')).toBe('html');
    expect(getBodyType('text/plain')).toBe('text');
  });
});
