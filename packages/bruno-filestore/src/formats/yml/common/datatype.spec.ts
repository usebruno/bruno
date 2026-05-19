import {
  isBrunoVariableDatatype,
  isTypedValue,
  hasTypedMetadata,
  toOpenCollectionTypedValue,
  fromOpenCollectionTypedValue
} from './datatype';

describe('datatype helpers', () => {
  describe('isBrunoVariableDatatype', () => {
    it('returns true for supported Bruno datatypes', () => {
      expect(isBrunoVariableDatatype('string')).toBe(true);
      expect(isBrunoVariableDatatype('number')).toBe(true);
      expect(isBrunoVariableDatatype('boolean')).toBe(true);
      expect(isBrunoVariableDatatype('object')).toBe(true);
    });

    it('returns false for unsupported OpenCollection datatypes (e.g. null)', () => {
      expect(isBrunoVariableDatatype('null')).toBe(false);
    });

    it('returns false for non-string inputs', () => {
      expect(isBrunoVariableDatatype(undefined)).toBe(false);
      expect(isBrunoVariableDatatype(null)).toBe(false);
      expect(isBrunoVariableDatatype(42)).toBe(false);
      expect(isBrunoVariableDatatype({})).toBe(false);
    });
  });

  describe('isTypedValue', () => {
    it('returns true for OpenCollection typed-value shapes', () => {
      expect(isTypedValue({ type: 'number', data: '42' })).toBe(true);
      expect(isTypedValue({ type: 'object', data: '{}' })).toBe(true);
    });

    it('returns false for plain strings', () => {
      expect(isTypedValue('hello')).toBe(false);
      expect(isTypedValue('')).toBe(false);
    });

    it('returns false for arrays, null, and objects missing type/data', () => {
      expect(isTypedValue(null)).toBe(false);
      expect(isTypedValue([])).toBe(false);
      expect(isTypedValue([{ type: 'number', data: '1' }])).toBe(false);
      expect(isTypedValue({ type: 'number' })).toBe(false);
      expect(isTypedValue({ data: '1' })).toBe(false);
      expect(isTypedValue({})).toBe(false);
    });
  });

  describe('hasTypedMetadata', () => {
    it('returns false when datatype is missing', () => {
      expect(hasTypedMetadata({})).toBe(false);
    });

    it('returns false when datatype is the string default', () => {
      expect(hasTypedMetadata({ datatype: 'string' })).toBe(false);
    });

    it('returns true for non-string datatypes', () => {
      expect(hasTypedMetadata({ datatype: 'number' })).toBe(true);
      expect(hasTypedMetadata({ datatype: 'boolean' })).toBe(true);
      expect(hasTypedMetadata({ datatype: 'object' })).toBe(true);
    });
  });

  describe('toOpenCollectionTypedValue', () => {
    it('builds a {type, data} struct from datatype + stringified value', () => {
      expect(toOpenCollectionTypedValue({ datatype: 'number' }, '42'))
        .toEqual({ type: 'number', data: '42' });
      expect(toOpenCollectionTypedValue({ datatype: 'boolean' }, 'true'))
        .toEqual({ type: 'boolean', data: 'true' });
      expect(toOpenCollectionTypedValue({ datatype: 'object' }, '{"a":1}'))
        .toEqual({ type: 'object', data: '{"a":1}' });
    });

    it('falls back to type "string" when datatype is missing', () => {
      expect(toOpenCollectionTypedValue({}, 'hello'))
        .toEqual({ type: 'string', data: 'hello' });
    });
  });

  describe('fromOpenCollectionTypedValue', () => {
    it('coerces typed values to their declared datatype', () => {
      expect(fromOpenCollectionTypedValue({ type: 'number', data: '42' }))
        .toEqual({ value: 42, datatype: 'number' });
      expect(fromOpenCollectionTypedValue({ type: 'boolean', data: 'true' }))
        .toEqual({ value: true, datatype: 'boolean' });
      expect(fromOpenCollectionTypedValue({ type: 'object', data: '{"a":1}' }))
        .toEqual({ value: { a: 1 }, datatype: 'object' });
    });

    it('falls back to string when the declared type is unsupported (e.g. null)', () => {
      const result = fromOpenCollectionTypedValue({ type: 'null' as any, data: '' });
      expect(result.datatype).toBeUndefined();
    });

    it('coerces non-string data to a string before coercing by datatype', () => {
      const result = fromOpenCollectionTypedValue({ type: 'number', data: 42 as any });
      expect(result.value).toBe(42);
      expect(result.datatype).toBe('number');
    });

    it('returns the raw string when coercion fails (e.g. non-numeric @number)', () => {
      const result = fromOpenCollectionTypedValue({ type: 'number', data: 'not-a-number' });
      expect(result.value).toBe('not-a-number');
      expect(result.datatype).toBe('number');
    });
  });
});
