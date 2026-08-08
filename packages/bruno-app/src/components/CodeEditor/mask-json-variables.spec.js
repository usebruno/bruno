import * as jsonlintNamespace from '@prantlf/jsonlint';
import { maskJsonTemplateVariables } from './mask-json-variables';

// Parses through the same jsonlint the lint site uses. Comment stripping lives
// in the lint site (out of scope for the masker); these fixtures have none, so
// parsing the masked text directly is equivalent to the full lint pipeline.
// jsonlint v16 has no `.parser` property, so the `||` falls back to the namespace.
const jsonlint = jsonlintNamespace.parser || jsonlintNamespace;
const lintParse = (text) => jsonlint.parse(text);

// The pre-fix inline mask, kept to document the baseline behaviour: it leaks an
// unquoted standalone fragment through unmasked, so jsonlint reports a false
// "Unexpected token". Not exported by the helper.
const LEGACY_INLINE_MASK = /(?<!"[^":{]*){{[^}]*}}(?![^"},]*")/g;

describe('CodeEditor / maskJsonTemplateVariables', () => {
  describe('issue #8859 — unquoted fragment splicing into an array', () => {
    const body = ['[', '  { "abc": 1 },', '  {{DEDUPLICATION}}', '  { "ccc": 3 }', ']'].join('\n');

    it('the legacy inline mask still leaves the standalone fragment unmasked', () => {
      // The legacy regex does not mask the standalone placeholder (its lookahead
      // crosses into the next object), so jsonlint chokes on `{{DEDUPLICATION}}`.
      const legacyMasked = body.replace(LEGACY_INLINE_MASK, '1');
      expect(legacyMasked).toContain('{{DEDUPLICATION}}');
      expect(() => lintParse(legacyMasked)).toThrow();
    });

    it('the helper masks the fragment so the body lints clean', () => {
      const masked = maskJsonTemplateVariables(body);
      // Both real objects survive; the standalone fragment is gone and the comma
      // structure between the two objects is preserved.
      expect(masked).toContain('{ "abc": 1 }');
      expect(masked).toContain('{ "ccc": 3 }');
      expect(masked).not.toContain('{{DEDUPLICATION}}');
      expect(() => lintParse(masked)).not.toThrow();
    });
  });

  it('masks a value-position placeholder as a JSON value', () => {
    expect(maskJsonTemplateVariables('{"k": {{OBJ}}}')).toBe('{"k": 1}');
  });

  it('does not normalize when only value-position placeholders are present', () => {
    // Exercises the early return: no element removal -> no comma clean-up, and a
    // real trailing comma elsewhere is left intact for jsonlint to report.
    expect(maskJsonTemplateVariables('{"a": {{X}}, "b": {{Y}}}')).toBe('{"a": 1, "b": 1}');
  });

  it('treats a placeholder that is the whole body as a value', () => {
    // No structural char before it -> a single templated value, not a fragment.
    expect(maskJsonTemplateVariables('{{BODY}}')).toBe('1');
    expect(() => lintParse(maskJsonTemplateVariables('{{BODY}}'))).not.toThrow();
  });

  it('leaves a placeholder inside a quoted string untouched', () => {
    const masked = maskJsonTemplateVariables('{"msg": "hello {{name}}"}');
    expect(masked).toContain('{{name}}');
    expect(() => lintParse(masked)).not.toThrow();
  });

  it('does not rewrite commas that live inside a string literal', () => {
    // The `,,` is string content in a different part of the body; the element
    // removal in "list" must not collapse it (clean-up is scoped to the removal).
    const masked = maskJsonTemplateVariables('{"msg": "a,,b", "list": [{{X}}]}');
    expect(masked).toContain('"a,,b"');
    expect(() => lintParse(masked)).not.toThrow();
  });

  it('still reports a genuine syntax error that is independent of the placeholder', () => {
    // "bad" has no value (independent of {{X}}); the masker must not repair it.
    expect(() => lintParse(maskJsonTemplateVariables('{\n  "ok": {{X}},\n  "bad":\n}'))).toThrow();
  });

  it('still reports a real comma error that is unrelated to a removed fragment', () => {
    // The trailing comma in [1,] is a genuine user mistake in a different part of
    // the body than the removed [{{X}}]; comma clean-up is scoped to the removal
    // site, so this error survives masking.
    const body = '{"good": [1,], "list": [{{X}}]}';
    expect(() => lintParse(maskJsonTemplateVariables(body))).toThrow();
  });

  it.each([
    ['first element', '[{{A}}, { "c": 1 }]', '[ { "c": 1 }]'],
    ['last element (trailing comma normalised)', '[ { "c": 1 }, {{Z}}]', '[ { "c": 1 }]'],
    ['only element', '[{{X}}]', '[]']
  ])('masks an element-position placeholder cleanly: %s', (_name, body, expected) => {
    expect(maskJsonTemplateVariables(body)).toBe(expected);
    expect(() => lintParse(maskJsonTemplateVariables(body))).not.toThrow();
  });

  it('collapses a run of interior element fragments and keeps the neighbours', () => {
    // Drives the do-while loop for 3+ passes and isolates the `, REMOVED ,` rule.
    expect(maskJsonTemplateVariables('[1, {{A}}, {{B}}, {{C}}, 2]')).toBe('[1, 2]');
  });

  it('masks an object-member fragment', () => {
    // A placeholder splicing several object members (not just array elements).
    expect(() => lintParse(maskJsonTemplateVariables('{ "a": 1, {{MEMBERS}}, "b": 2 }'))).not.toThrow();
  });
});
