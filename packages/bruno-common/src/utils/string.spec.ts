import { normalizeLineEndings } from './string';

describe('normalizeLineEndings', () => {
  it('converts CRLF to LF', () => {
    expect(normalizeLineEndings('a\r\nb\r\n')).toBe('a\nb\n');
  });

  it('converts lone CR to LF', () => {
    expect(normalizeLineEndings('a\rb')).toBe('a\nb');
  });

  it('leaves LF and escape-sequence text untouched', () => {
    expect(normalizeLineEndings('a\nb // \\r\\n')).toBe('a\nb // \\r\\n');
  });
});
