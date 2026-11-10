// strip-json-comments is an ESM-only package, and Jest's CommonJS interop in this repo
// does not expose its default export as a callable function. The app bundle uses the
// real package. This stub keeps the same whitespace-preserving behaviour for line
// comments, so error line numbers stay correct in these tests.
jest.mock('strip-json-comments', () => ({
  __esModule: true,
  default: (text) => text.replace(/\/\/[^\n]*/g, (comment) => ' '.repeat(comment.length))
}));

import { getJsonLintAnnotations } from './json-lint';

describe('getJsonLintAnnotations', () => {
  test('returns no annotations for valid JSON', () => {
    expect(getJsonLintAnnotations('{\n  "name": "bruno"\n}')).toEqual([]);
  });

  test('highlights the whole line of a syntax error, not a zero-width point', () => {
    const text = '{\n  "a": 1,\n  "b": oops\n}';

    const annotations = getJsonLintAnnotations(text);

    expect(annotations).toHaveLength(1);
    const [annotation] = annotations;
    expect(annotation.from).toEqual({ line: 2, ch: 0 });
    expect(annotation.to).toEqual({ line: 2, ch: '  "b": oops'.length });
    expect(annotation.severity).toBe('error');
    expect(annotation.message).toMatch(/line 3/);
  });

  test('keeps a non-empty range so the error stays visible on a blank line', () => {
    const text = '{\n  "a": 1,\n\n}';

    const annotations = getJsonLintAnnotations(text);

    expect(annotations).toHaveLength(1);
    const [annotation] = annotations;
    expect(annotation.from.line).toBe(annotation.to.line);
    expect(annotation.to.ch).toBeGreaterThan(annotation.from.ch);
  });

  test('accepts {{variable}} placeholders inside JSON values', () => {
    expect(getJsonLintAnnotations('{\n  "id": {{userId}}\n}')).toEqual([]);
  });

  test('accepts comments', () => {
    expect(getJsonLintAnnotations('// note\n{\n  "a": 1\n}')).toEqual([]);
  });

  test('reports the line of an error that follows a comment line', () => {
    const text = '// header\n{\n  "a": oops\n}';

    const [annotation] = getJsonLintAnnotations(text);

    expect(annotation.from.line).toBe(2);
  });
});
