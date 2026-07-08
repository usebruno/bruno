import {
  parseValueByDataType,
  getDataTypeFromValue,
  validateDataTypeValue,
  valueToString,
  BRUNO_VARIABLE_DATATYPES,
  isBrunoVariableDataType
} from './datatype';

/*
 * Canonical coercion test matrix. `@usebruno/lang` and `@usebruno/filestore`
 * both delegate to `parseValueByDataType` from this package, so this is the
 * only place the contract is exercised in detail.
 */

const parse = (value: any, dataType: any) => parseValueByDataType(value, dataType);

describe('parseValueByDataType — shared matrix', () => {
  describe('passthrough cases', () => {
    it('returns the raw value when dataType is missing or "string"', () => {
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
      // or validateDataTypeValue can't flag the mismatch.
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

  describe('dataType param contract', () => {
    // The `dataType` param is typed as `BrunoVariableDataType | undefined`.
    // Anything outside the union is a type error at compile time. At runtime we
    // pin down the passthrough behavior so a stray uppercase / unknown string
    // never silently mis-coerces.
    it('passes through unchanged when dataType is outside the union (runtime guard)', () => {
      expect(parse('42', 'NUMBER' as any)).toBe('42');
      expect(parse('42', 'Number' as any)).toBe('42');
      expect(parse('true', 'bool' as any)).toBe('true');
      expect(parse('{"a":1}', 'json' as any)).toBe('{"a":1}');
      expect(parse('hi', '' as any)).toBe('hi');
    });
  });
});

describe('BRUNO_VARIABLE_DATATYPES / isBrunoVariableDataType', () => {
  it('exposes exactly the four bruno variable datatypes in canonical order', () => {
    expect(BRUNO_VARIABLE_DATATYPES).toEqual(['string', 'number', 'boolean', 'object']);
  });

  it('recognizes every member of the canonical list', () => {
    for (const t of BRUNO_VARIABLE_DATATYPES) {
      expect(isBrunoVariableDataType(t)).toBe(true);
    }
  });

  it('rejects anything outside the canonical list', () => {
    expect(isBrunoVariableDataType('null')).toBe(false);
    expect(isBrunoVariableDataType('NUMBER')).toBe(false);
    expect(isBrunoVariableDataType('')).toBe(false);
    expect(isBrunoVariableDataType(undefined)).toBe(false);
    expect(isBrunoVariableDataType(null)).toBe(false);
    expect(isBrunoVariableDataType(42)).toBe(false);
  });
});

describe('getDataTypeFromValue', () => {
  it('returns "string" for null/undefined/empty', () => {
    expect(getDataTypeFromValue(undefined)).toBe('string');
    expect(getDataTypeFromValue(null)).toBe('string');
    expect(getDataTypeFromValue('')).toBe('string');
  });

  it('maps native JS types to bruno datatypes', () => {
    expect(getDataTypeFromValue(42)).toBe('number');
    expect(getDataTypeFromValue(0)).toBe('number');
    expect(getDataTypeFromValue(true)).toBe('boolean');
    expect(getDataTypeFromValue(false)).toBe('boolean');
    expect(getDataTypeFromValue({ a: 1 })).toBe('object');
    expect(getDataTypeFromValue([1, 2])).toBe('object');
  });

  it('keeps strings as "string" regardless of content', () => {
    expect(getDataTypeFromValue('42')).toBe('string');
    expect(getDataTypeFromValue('true')).toBe('string');
    expect(getDataTypeFromValue('{"a":1}')).toBe('string');
    expect(getDataTypeFromValue(JSON.stringify({ x: 1 }))).toBe('string');
    expect(getDataTypeFromValue('plain text')).toBe('string');
  });
});

describe('validateDataTypeValue', () => {
  it('returns null when dataType is missing or "string"', () => {
    expect(validateDataTypeValue('anything', undefined)).toBeNull();
    expect(validateDataTypeValue('anything', 'string')).toBeNull();
  });

  it('returns null for null/undefined values regardless of dataType', () => {
    expect(validateDataTypeValue(null, 'number')).toBeNull();
    expect(validateDataTypeValue(undefined, 'object')).toBeNull();
  });

  it('validates numbers', () => {
    expect(validateDataTypeValue(42, 'number')).toBeNull();
    expect(validateDataTypeValue('42', 'number')).toBe('Value is not a valid number');
    expect(validateDataTypeValue('abc', 'number')).toBe('Value is not a valid number');
  });

  it('validates booleans', () => {
    expect(validateDataTypeValue(true, 'boolean')).toBeNull();
    expect(validateDataTypeValue('true', 'boolean')).toBe('Value is not a valid boolean');
    expect(validateDataTypeValue(1, 'boolean')).toBe('Value is not a valid boolean');
  });

  it('validates objects', () => {
    expect(validateDataTypeValue({ a: 1 }, 'object')).toBeNull();
    expect(validateDataTypeValue([1, 2], 'object')).toBeNull();
    expect(validateDataTypeValue('{"a":1}', 'object')).toBe('Value is not a valid object');
    expect(validateDataTypeValue('not json', 'object')).toBe('Value is not a valid object');
  });
});

describe('valueToString — round-trip with parseValueByDataType', () => {
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

  it('pretty-prints object/array values when given an indent', () => {
    expect(valueToString({ a: 1 }, 2)).toBe('{\n  "a": 1\n}');
    expect(valueToString([1, 2], 2)).toBe('[\n  1,\n  2\n]');
    // Primitives ignore the indent.
    expect(valueToString(42, 2)).toBe('42');
    expect(valueToString('hi', 2)).toBe('hi');
    // Still round-trips when indented.
    expect(parseValueByDataType(valueToString({ a: 1 }, 2), 'object')).toEqual({ a: 1 });
  });

  it('round-trips through parseValueByDataType for every supported dataType', () => {
    expect(parseValueByDataType(valueToString(42), 'number')).toBe(42);
    expect(parseValueByDataType(valueToString(true), 'boolean')).toBe(true);
    expect(parseValueByDataType(valueToString({ a: 1 }), 'object')).toEqual({ a: 1 });
    expect(parseValueByDataType(valueToString([1, 2]), 'object')).toEqual([1, 2]);
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
