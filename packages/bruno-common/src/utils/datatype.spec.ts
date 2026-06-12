import {
  parseValueByDatatype,
  getDatatypeFromValue,
  validateDatatypeValue,
  valueToString,
  BRUNO_VARIABLE_DATATYPES,
  isBrunoVariableDatatype
} from './datatype';

/*
 * Canonical coercion test matrix. `@usebruno/lang` and `@usebruno/filestore`
 * both delegate to `parseValueByDatatype` from this package, so this is the
 * only place the contract is exercised in detail.
 */

const parse = (value: any, datatype: any) => parseValueByDatatype(value, datatype);

describe('parseValueByDatatype — shared matrix', () => {
  describe('passthrough cases', () => {
    it('returns the raw value when datatype is missing or "string"', () => {
      expect(parse('hi', undefined)).toBe('hi');
      expect(parse('hi', 'string')).toBe('hi');
      expect(parse(42, 'string')).toBe(42);
    });
  });

  describe('number', () => {
    it('coerces numeric strings', () => {
      expect(parse('42', 'number')).toBe(42);
      expect(parse('  42  ', 'number')).toBe(42);
      expect(parse('-3.14', 'number')).toBe(-3.14);
    });

    it('short-circuits when value is already a number', () => {
      expect(parse(42, 'number')).toBe(42);
      expect(parse(0, 'number')).toBe(0);
    });

    it('does NOT coerce empty/whitespace strings to 0', () => {
      // Guard against `Number('')` returning 0.
      expect(parse('', 'number')).toBe('');
      expect(parse('   ', 'number')).toBe('   ');
    });

    it('falls back to the raw value when not numeric', () => {
      expect(parse('abc', 'number')).toBe('abc');
      expect(parse('1abc', 'number')).toBe('1abc');
    });

    it('falls back when value is null/undefined', () => {
      expect(parse(null, 'number')).toBeNull();
      expect(parse(undefined, 'number')).toBeUndefined();
    });
  });

  describe('boolean', () => {
    it('coerces "true"/"false" strings', () => {
      expect(parse('true', 'boolean')).toBe(true);
      expect(parse('false', 'boolean')).toBe(false);
    });

    it('short-circuits when value is already a boolean', () => {
      expect(parse(true, 'boolean')).toBe(true);
      expect(parse(false, 'boolean')).toBe(false);
    });

    it('falls back to the raw value for anything else', () => {
      expect(parse('True', 'boolean')).toBe('True'); // strict — case-sensitive by design
      expect(parse('1', 'boolean')).toBe('1');
      expect(parse('yes', 'boolean')).toBe('yes');
    });
  });

  describe('object', () => {
    it('coerces JSON object strings', () => {
      expect(parse('{"a":1}', 'object')).toEqual({ a: 1 });
      expect(parse('[1,2,3]', 'object')).toEqual([1, 2, 3]);
    });

    it('short-circuits when value is already an object', () => {
      const obj = { a: 1 };
      expect(parse(obj, 'object')).toBe(obj);
    });

    it('falls back when JSON parses to a primitive', () => {
      // Scalars (string/number/null/bool) must not be returned as "object",
      // or validateDatatypeValue can't flag the mismatch.
      expect(parse('"hello"', 'object')).toBe('"hello"');
      expect(parse('42', 'object')).toBe('42');
      expect(parse('null', 'object')).toBe('null');
      expect(parse('true', 'object')).toBe('true');
    });

    it('falls back when value is not valid JSON', () => {
      expect(parse('not json', 'object')).toBe('not json');
      expect(parse('{bad}', 'object')).toBe('{bad}');
    });

    it('does NOT call JSON.parse on empty/whitespace strings or null/undefined', () => {
      // Empty/whitespace short-circuit (matching the number branch) so we don't
      // rely on JSON.parse to throw inside the try/catch.
      expect(parse('', 'object')).toBe('');
      expect(parse('   ', 'object')).toBe('   ');
      expect(parse(null, 'object')).toBeNull();
      expect(parse(undefined, 'object')).toBeUndefined();
    });
  });

  describe('datatype param contract', () => {
    // The `datatype` param is typed as `BrunoVariableDatatype | undefined`.
    // Anything outside the union is a type error at compile time. At runtime we
    // pin down the passthrough behavior so a stray uppercase / unknown string
    // never silently mis-coerces.
    it('passes through unchanged when datatype is outside the union (runtime guard)', () => {
      expect(parse('42', 'NUMBER' as any)).toBe('42');
      expect(parse('42', 'Number' as any)).toBe('42');
      expect(parse('true', 'bool' as any)).toBe('true');
      expect(parse('{"a":1}', 'json' as any)).toBe('{"a":1}');
      expect(parse('hi', '' as any)).toBe('hi');
    });
  });
});

describe('BRUNO_VARIABLE_DATATYPES / isBrunoVariableDatatype', () => {
  it('exposes exactly the four bruno variable datatypes in canonical order', () => {
    expect(BRUNO_VARIABLE_DATATYPES).toEqual(['string', 'number', 'boolean', 'object']);
  });

  it('recognizes every member of the canonical list', () => {
    for (const t of BRUNO_VARIABLE_DATATYPES) {
      expect(isBrunoVariableDatatype(t)).toBe(true);
    }
  });

  it('rejects anything outside the canonical list', () => {
    expect(isBrunoVariableDatatype('null')).toBe(false);
    expect(isBrunoVariableDatatype('NUMBER')).toBe(false);
    expect(isBrunoVariableDatatype('')).toBe(false);
    expect(isBrunoVariableDatatype(undefined)).toBe(false);
    expect(isBrunoVariableDatatype(null)).toBe(false);
    expect(isBrunoVariableDatatype(42)).toBe(false);
  });
});

describe('getDatatypeFromValue', () => {
  it('returns "string" for null/undefined/empty', () => {
    expect(getDatatypeFromValue(undefined)).toBe('string');
    expect(getDatatypeFromValue(null)).toBe('string');
    expect(getDatatypeFromValue('')).toBe('string');
  });

  it('maps native JS types to bruno datatypes', () => {
    expect(getDatatypeFromValue(42)).toBe('number');
    expect(getDatatypeFromValue(0)).toBe('number');
    expect(getDatatypeFromValue(true)).toBe('boolean');
    expect(getDatatypeFromValue(false)).toBe('boolean');
    expect(getDatatypeFromValue({ a: 1 })).toBe('object');
    expect(getDatatypeFromValue([1, 2])).toBe('object');
  });

  it('keeps strings as "string" regardless of content', () => {
    expect(getDatatypeFromValue('42')).toBe('string');
    expect(getDatatypeFromValue('true')).toBe('string');
    expect(getDatatypeFromValue('{"a":1}')).toBe('string');
    expect(getDatatypeFromValue(JSON.stringify({ x: 1 }))).toBe('string');
    expect(getDatatypeFromValue('plain text')).toBe('string');
  });
});

describe('validateDatatypeValue', () => {
  it('returns null when datatype is missing or "string"', () => {
    expect(validateDatatypeValue('anything', undefined)).toBeNull();
    expect(validateDatatypeValue('anything', 'string')).toBeNull();
  });

  it('returns null for null/undefined values regardless of datatype', () => {
    expect(validateDatatypeValue(null, 'number')).toBeNull();
    expect(validateDatatypeValue(undefined, 'object')).toBeNull();
  });

  it('validates numbers', () => {
    expect(validateDatatypeValue(42, 'number')).toBeNull();
    expect(validateDatatypeValue('42', 'number')).toBe('Value is not a valid number');
    expect(validateDatatypeValue('abc', 'number')).toBe('Value is not a valid number');
  });

  it('validates booleans', () => {
    expect(validateDatatypeValue(true, 'boolean')).toBeNull();
    expect(validateDatatypeValue('true', 'boolean')).toBe('Value is not a valid boolean');
    expect(validateDatatypeValue(1, 'boolean')).toBe('Value is not a valid boolean');
  });

  it('validates objects', () => {
    expect(validateDatatypeValue({ a: 1 }, 'object')).toBeNull();
    expect(validateDatatypeValue([1, 2], 'object')).toBeNull();
    expect(validateDatatypeValue('{"a":1}', 'object')).toBe('Value is not a valid object');
    expect(validateDatatypeValue('not json', 'object')).toBe('Value is not a valid object');
  });
});

describe('valueToString — round-trip with parseValueByDatatype', () => {
  it('stringifies typed values', () => {
    expect(valueToString('hi')).toBe('hi');
    expect(valueToString(42)).toBe('42');
    expect(valueToString(true)).toBe('true');
    expect(valueToString({ a: 1 })).toBe('{"a":1}');
    expect(valueToString([1, 2])).toBe('[1,2]');
  });

  it('treats null/undefined as empty string', () => {
    expect(valueToString(null)).toBe('');
    expect(valueToString(undefined)).toBe('');
  });

  it('round-trips through parseValueByDatatype for every supported datatype', () => {
    expect(parseValueByDatatype(valueToString(42), 'number')).toBe(42);
    expect(parseValueByDatatype(valueToString(true), 'boolean')).toBe(true);
    expect(parseValueByDatatype(valueToString({ a: 1 }), 'object')).toEqual({ a: 1 });
    expect(parseValueByDatatype(valueToString([1, 2]), 'object')).toEqual([1, 2]);
  });

  it('returns empty string for functions and symbols', () => {
    expect(valueToString(() => 42)).toBe('');
    expect(valueToString(function named() {})).toBe('');
    expect(valueToString(Symbol('s'))).toBe('');
  });

  it('returns empty string for objects with circular references', () => {
    const circular: any = { a: 1 };
    circular.self = circular;
    expect(valueToString(circular)).toBe('');
  });

  it('stringifies arrays containing undefined slots as null', () => {
    expect(valueToString([undefined] as any)).toBe('[null]');
    expect(valueToString([1, undefined, 3] as any)).toBe('[1,null,3]');
  });

  it('drops object properties whose values are functions or symbols (JSON.stringify behavior)', () => {
    expect(valueToString({ a: 1, b: () => 2 })).toBe('{"a":1}');
    expect(valueToString({ a: 1, b: Symbol('s') })).toBe('{"a":1}');
  });
});
