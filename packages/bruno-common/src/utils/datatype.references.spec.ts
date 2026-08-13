import { parseValueByDataType } from './datatype';

// Reference resolution — when a variable's raw value is a whole-string
// `{{reference}}`, parseValueByDataType returns the referenced variable's
// real JS value uncoerced, so callers see the target's actual type.
// Everything else — plain coercion, valueToString, validation — lives in
// ./datatype.spec.ts.

describe('parseValueByDataType — reference resolution', () => {
  describe('resolves whole-string references', () => {
    it('flat name', () => {
      expect(parseValueByDataType('{{s}}', 'string', { s: 'hi' })).toBe('hi');
      expect(parseValueByDataType('{{n}}', 'number', { n: 7 })).toBe(7);
      expect(parseValueByDataType('{{b}}', 'boolean', { b: true })).toBe(true);
      expect(parseValueByDataType('{{o}}', 'object', { o: { a: 1 } })).toEqual({ a: 1 });
    });

    it('nested dotted path', () => {
      expect(parseValueByDataType('{{p.s}}', 'string', { p: { s: 'hi' } })).toBe('hi');
      expect(parseValueByDataType('{{p.n}}', 'number', { p: { n: 7 } })).toBe(7);
      expect(parseValueByDataType('{{p.b}}', 'boolean', { p: { b: true } })).toBe(true);
    });

    it('numeric segment walks arrays', () => {
      expect(parseValueByDataType('{{a.0}}', 'number', { a: [2, true] })).toBe(2);
      expect(parseValueByDataType('{{a.1}}', 'boolean', { a: [2, true] })).toBe(true);
    });

    it('bare array reference returns the array itself', () => {
      expect(parseValueByDataType('{{a}}', 'object', { a: [2, true] })).toEqual([2, true]);
    });

    it('a literal dotted key wins over walking the dotted path', () => {
      // Otherwise a variable named `nested.count` would be shadowed by
      // walking `nested` → `count`.
      const vars = { 'nested.count': 99, 'nested': { count: 3 } };
      expect(parseValueByDataType('{{nested.count}}', 'number', vars)).toBe(99);
    });

    it('surrounding whitespace inside braces is tolerated', () => {
      expect(parseValueByDataType('  {{ nested.count }}  ', 'number', { nested: { count: 3 } })).toBe(3);
    });
  });

  describe('does not resolve — falls through to normal coercion', () => {
    it('partial reference (id-{{count}})', () => {
      expect(parseValueByDataType('id-{{count}}', 'number', { count: 7 })).toBe('id-{{count}}');
    });

    it('unknown variable ({{missing}})', () => {
      expect(parseValueByDataType('{{missing}}', 'number', {})).toBe('{{missing}}');
    });

    it('resolvableVariables arg omitted entirely', () => {
      expect(parseValueByDataType('{{count}}', 'number')).toBe('{{count}}');
    });

    it('variable declared but set to undefined', () => {
      // Otherwise `resolveWholeReference` would return `undefined`, hiding
      // the raw `{{count}}` value from the caller and skipping normal coercion.
      expect(parseValueByDataType('{{count}}', 'number', { count: undefined })).toBe('{{count}}');
      expect(parseValueByDataType('{{count}}', 'string', { count: undefined })).toBe('{{count}}');
    });

    it('whitespace-containing identifier ({{a b c}})', () => {
      expect(parseValueByDataType('{{a b c}}', 'string', { 'a b c': 'yep' })).toBe('{{a b c}}');
    });

    it('out-of-bounds array index', () => {
      expect(parseValueByDataType('{{data.abc.2}}', 'number', { data: { abc: [2, true] } })).toBe('{{data.abc.2}}');
    });
  });

  describe('returns the resolved value uncoerced', () => {
    it('a JSON-shaped string is not re-parsed under declared:object', () => {
      // Otherwise the resolved '{"a":1}' would be JSON.parsed into an object
      // and hide a real type mismatch from validation downstream.
      expect(parseValueByDataType('{{label}}', 'object', { label: '{"a":1}' })).toBe('{"a":1}');
    });

    it('the referenced type is authoritative — declared type is ignored', () => {
      // A number-valued variable stays a number no matter what you declared.
      expect(parseValueByDataType('{{count}}', 'string', { count: 7 })).toBe(7);
      expect(parseValueByDataType('{{count}}', undefined, { count: 7 })).toBe(7);
    });
  });
});
