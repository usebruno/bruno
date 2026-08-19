import { parseValueByDataType, resolveReference, validateDataTypeValue } from './datatype';

// resolveReference — when a variable's raw value is a whole-string
// `{{reference}}` and the referenced name exists in `resolvableVariables`,
// return the referenced variable's real JS value uncoerced. Otherwise return
// `undefined` so the caller falls through to normal coercion.
//
// This file tests resolveReference in isolation, then pins the recommended
// composition with parseValueByDataType (as used by DataTypeSelector).
// Everything else — plain coercion, valueToString, validation — lives in
// ./datatype.spec.ts.

describe('resolveReference', () => {
  describe('resolves whole-string references', () => {
    it('flat name', () => {
      expect(resolveReference('{{s}}', { s: 'hi' })).toBe('hi');
      expect(resolveReference('{{n}}', { n: 7 })).toBe(7);
      expect(resolveReference('{{b}}', { b: true })).toBe(true);
      expect(resolveReference('{{o}}', { o: { a: 1 } })).toEqual({ a: 1 });
    });

    it('nested dotted path', () => {
      expect(resolveReference('{{p.s}}', { p: { s: 'hi' } })).toBe('hi');
      expect(resolveReference('{{p.n}}', { p: { n: 7 } })).toBe(7);
      expect(resolveReference('{{p.b}}', { p: { b: true } })).toBe(true);
    });

    it('numeric segment walks arrays', () => {
      expect(resolveReference('{{a.0}}', { a: [2, true] })).toBe(2);
      expect(resolveReference('{{a.1}}', { a: [2, true] })).toBe(true);
    });

    it('bare array reference returns the array itself', () => {
      expect(resolveReference('{{a}}', { a: [2, true] })).toEqual([2, true]);
    });

    it('a literal dotted key wins over walking the dotted path', () => {
      // Otherwise a variable named `nested.count` would be shadowed by
      // walking `nested` → `count`.
      const vars = { 'nested.count': 99, 'nested': { count: 3 } };
      expect(resolveReference('{{nested.count}}', vars)).toBe(99);
    });

    it('surrounding whitespace inside braces is tolerated', () => {
      expect(resolveReference('  {{ nested.count }}  ', { nested: { count: 3 } })).toBe(3);
    });

    it('a variable set to null resolves to null (distinct from undefined)', () => {
      // Callers use `resolved !== undefined` — not `!= null` — so a real null
      // value survives the composition.
      expect(resolveReference('{{count}}', { count: null })).toBeNull();
    });
  });

  describe('does not resolve — returns undefined', () => {
    it('partial reference (id-{{count}})', () => {
      expect(resolveReference('id-{{count}}', { count: 7 })).toBeUndefined();
    });

    it('unknown variable ({{missing}})', () => {
      expect(resolveReference('{{missing}}', {})).toBeUndefined();
    });

    it('resolvableVariables arg omitted entirely', () => {
      expect(resolveReference('{{count}}')).toBeUndefined();
    });

    it('variable declared but set to undefined', () => {
      // Treated as unresolved so the caller falls through to normal coercion.
      expect(resolveReference('{{count}}', { count: undefined })).toBeUndefined();
    });

    it('whitespace-containing identifier ({{a b c}})', () => {
      expect(resolveReference('{{a b c}}', { 'a b c': 'yep' })).toBeUndefined();
    });

    it('out-of-bounds array index', () => {
      expect(resolveReference('{{data.abc.2}}', { data: { abc: [2, true] } })).toBeUndefined();
    });

    it('non-string values', () => {
      expect(resolveReference(42, { count: 7 })).toBeUndefined();
      expect(resolveReference(null, { count: 7 })).toBeUndefined();
      expect(resolveReference(undefined, { count: 7 })).toBeUndefined();
    });
  });

  describe('recommended composition — resolve first, coerce only if unresolved', () => {
    // These tests pin the pattern DataTypeSelector uses. If you're editing the
    // resolve/coerce/validate pipeline anywhere else, mirror this shape so a
    // resolved value is never re-coerced.
    const compose = (value: any, dataType: any, vars?: Record<string, any>) => {
      const resolved = resolveReference(value, vars);
      return resolved !== undefined ? resolved : parseValueByDataType(value, dataType);
    };

    it('a JSON-shaped string resolved from a reference is NOT re-parsed to an object', () => {
      // Bare parseValueByDataType would JSON.parse '{"a":1}' when dataType is
      // 'object'. The ternary skips that path — resolved values stay uncoerced.
      expect(compose('{{label}}', 'object', { label: '{"a":1}' })).toBe('{"a":1}');
      expect(validateDataTypeValue(compose('{{label}}', 'object', { label: '{"a":1}' }), 'object'))
        .toBe('Value is not a valid object');
    });

    it('a literal (non-reference) value still gets coerced', () => {
      expect(compose('{"a":1}', 'object')).toEqual({ a: 1 });
      expect(compose('42', 'number')).toBe(42);
      expect(compose('true', 'boolean')).toBe(true);
    });

    it('an unresolved reference (unknown var, no vars, partial) falls through to coercion', () => {
      expect(compose('{{missing}}', 'number', {})).toBe('{{missing}}');
      expect(compose('{{count}}', 'number')).toBe('{{count}}');
      expect(compose('id-{{count}}', 'number', { count: 7 })).toBe('id-{{count}}');
    });

    it('the referenced type is authoritative — declared type is ignored on resolve', () => {
      // A number-valued variable stays a number no matter what you declared.
      expect(compose('{{count}}', 'string', { count: 7 })).toBe(7);
      expect(compose('{{count}}', 'object', { count: 7 })).toBe(7);
      expect(validateDataTypeValue(compose('{{count}}', 'string', { count: 7 }), 'string')).toBeNull();
    });
  });
});
