import { parseValueByDataType, validateDataTypeValue, type BrunoVariableDataType } from './datatype';

// ────────────────────────────────────────────────────────────────────────────
// Reference resolution — parseValueByDataType('{{ref}}', declared, vars)
// ────────────────────────────────────────────────────────────────────────────
//
// This file covers ONE feature: when a variable's raw value is a whole-string
// `{{reference}}`, parseValueByDataType resolves the reference to the target
// variable's real JS value (uncoerced) so the caller can validate it against
// the declared type. Everything else — plain coercion, valueToString, the
// public-API contract — lives in ./datatype.spec.ts.
//
// If you're editing `resolveWholeReference` or `getByPath` in ./datatype.ts,
// this is the file to update.
//
// ─── How this file is organized ──────────────────────────────────────────
//
//   1. TARGETS       — one row per referenced-value category (what kind of
//                      JS value the {{ref}} resolves to).
//
//   2. MATRIX        — the readable truth table. Rows = target category,
//                      columns = declared type, cell = 'ok' | 'flag'. Read
//                      any cell to know what that combination should do.
//
//   3. Matrix tests  — a nested loop iterates MATRIX; every cell becomes a
//                      test. Missing cells fail TypeScript; mismatched
//                      TARGETS/MATRIX keys fail the guardrail.
//
//   4. Edge cases    — behaviors that don't fit the matrix, grouped by kind:
//                      • references that don't resolve
//                      • reference syntax accepted
//                      • resolution rules
//
// ─── How to add coverage ─────────────────────────────────────────────────
//
//   • New target category  → add a row to TARGETS and a row to MATRIX. The
//                            matrix loop generates 4 tests automatically.
//   • New declared type    → add a column to every MATRIX row (TypeScript
//                            forces you). Only ever needs a change if the
//                            BrunoVariableDataType union grows.
//   • New edge case        → add an `it` to the matching describe below.
//
// The unit matrix here mirrors the E2E matrix in
// tests/variable-datatypes/reference-types/cases.ts — same target categories,
// same declared types. When you add a category here, mirror it there too.

type Target
  = | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'nested-string'
    | 'nested-number'
    | 'nested-boolean'
    | 'array[number]'
    | 'array[boolean]'
    | 'array-itself';

// One representative fixture per target category. `input` is the raw value
// the caller would pass; `resolvesTo` is what parseValueByDataType should
// return after resolving the reference against `vars`.
const TARGETS: Record<Target, { input: string; resolvesTo: any; vars: Record<string, any> }> = {
  'string': { input: '{{s}}', resolvesTo: 'hi', vars: { s: 'hi' } },
  'number': { input: '{{n}}', resolvesTo: 7, vars: { n: 7 } },
  'boolean': { input: '{{b}}', resolvesTo: true, vars: { b: true } },
  'object': { input: '{{o}}', resolvesTo: { a: 1 }, vars: { o: { a: 1 } } },
  'nested-string': { input: '{{p.s}}', resolvesTo: 'hi', vars: { p: { s: 'hi' } } },
  'nested-number': { input: '{{p.n}}', resolvesTo: 7, vars: { p: { n: 7 } } },
  'nested-boolean': { input: '{{p.b}}', resolvesTo: true, vars: { p: { b: true } } },
  'array[number]': { input: '{{a.0}}', resolvesTo: 2, vars: { a: [2, true] } },
  'array[boolean]': { input: '{{a.1}}', resolvesTo: true, vars: { a: [2, true] } },
  'array-itself': { input: '{{a}}', resolvesTo: [2, true], vars: { a: [2, true] } }
};

// The truth table. Read one cell as: "When the reference resolves to a
// <row> and the variable is declared as <column>, should validation flag it?"
//
// declared:string is permissive — it accepts every referenced type.
// Every other declared type must match the referenced value's JS type.
//
//                                    declared:
//                                    string   number   boolean   object
const MATRIX: Record<Target, Record<BrunoVariableDataType, 'ok' | 'flag'>> = {
  'string': { string: 'ok', number: 'flag', boolean: 'flag', object: 'flag' },
  'number': { string: 'ok', number: 'ok', boolean: 'flag', object: 'flag' },
  'boolean': { string: 'ok', number: 'flag', boolean: 'ok', object: 'flag' },
  'object': { string: 'ok', number: 'flag', boolean: 'flag', object: 'ok' },
  'nested-string': { string: 'ok', number: 'flag', boolean: 'flag', object: 'flag' },
  'nested-number': { string: 'ok', number: 'ok', boolean: 'flag', object: 'flag' },
  'nested-boolean': { string: 'ok', number: 'flag', boolean: 'ok', object: 'flag' },
  'array[number]': { string: 'ok', number: 'ok', boolean: 'flag', object: 'flag' },
  'array[boolean]': { string: 'ok', number: 'flag', boolean: 'ok', object: 'flag' },
  'array-itself': { string: 'ok', number: 'flag', boolean: 'flag', object: 'ok' }
};

const DECLARED: BrunoVariableDataType[] = ['string', 'number', 'boolean', 'object'];

describe('parseValueByDataType — reference resolution', () => {
  describe('target × declared-type matrix', () => {
    for (const target of Object.keys(TARGETS) as Target[]) {
      const t = TARGETS[target];
      describe(`target: ${target}`, () => {
        for (const declared of DECLARED) {
          const expected = MATRIX[target][declared];
          const outcome = expected === 'ok' ? 'validates ok' : 'flags a mismatch';
          it(`declared: ${declared} — resolves to the target value and ${outcome}`, () => {
            const resolved = parseValueByDataType(t.input, declared, t.vars);
            expect(resolved).toEqual(t.resolvesTo);
            if (expected === 'ok') {
              expect(validateDataTypeValue(resolved, declared)).toBeNull();
            } else {
              expect(validateDataTypeValue(resolved, declared)).toBe(`Value is not a valid ${declared}`);
            }
          });
        }
      });
    }

    it('TARGETS and MATRIX cover the same target categories', () => {
      // Guardrail — if you add a row to only one map, the matrix silently
      // skips the pair. This fails loudly instead.
      expect(Object.keys(MATRIX).sort()).toEqual(Object.keys(TARGETS).sort());
    });
  });

  describe('references that do NOT resolve — falls through to normal coercion', () => {
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
      // Otherwise `resolveWholeReference` would return `undefined`, hiding the
      // raw `{{count}}` value from the caller and skipping normal coercion.
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

  describe('reference syntax accepted', () => {
    it('surrounding whitespace inside braces is tolerated', () => {
      expect(parseValueByDataType('  {{ nested.count }}  ', 'number', { nested: { count: 3 } })).toBe(3);
    });
  });

  describe('resolution rules', () => {
    it('a literal dotted key wins over walking the dotted path', () => {
      const vars = { 'nested.count': 99, 'nested': { count: 3 } };
      expect(parseValueByDataType('{{nested.count}}', 'number', vars)).toBe(99);
    });

    it('the resolved value is NEVER re-coerced (even if it looks like JSON)', () => {
      // If we re-coerced, the object branch would JSON.parse the resolved
      // string into an object and hide the mismatch from validateDataTypeValue.
      expect(parseValueByDataType('{{label}}', 'object', { label: '{"a":1}' })).toBe('{"a":1}');
    });

    it('the referenced type is authoritative — declared type is ignored', () => {
      // A number-valued variable stays a number no matter what you declared.
      expect(parseValueByDataType('{{count}}', 'string', { count: 7 })).toBe(7);
      expect(parseValueByDataType('{{count}}', undefined, { count: 7 })).toBe(7);
      expect(validateDataTypeValue(parseValueByDataType('{{count}}', 'string', { count: 7 }), 'string')).toBeNull();
    });
  });
});
