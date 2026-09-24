import {
  isBrunoVariableDataType,
  isTypedValue,
  hasTypedMetadata,
  toOpenCollectionTypedValue,
  fromOpenCollectionTypedValue
} from './datatype';

describe('dataType helpers', () => {
  describe('isBrunoVariableDataType', () => {
    it('returns true for supported Bruno datatypes', () => {
      expect(isBrunoVariableDataType('string')).toBe(true);
      expect(isBrunoVariableDataType('number')).toBe(true);
      expect(isBrunoVariableDataType('boolean')).toBe(true);
      expect(isBrunoVariableDataType('object')).toBe(true);
    });

    it('returns false for unsupported OpenCollection datatypes (e.g. null)', () => {
      expect(isBrunoVariableDataType('null')).toBe(false);
    });

    it('returns false for non-string inputs', () => {
      expect(isBrunoVariableDataType(undefined)).toBe(false);
      expect(isBrunoVariableDataType(null)).toBe(false);
      expect(isBrunoVariableDataType(42)).toBe(false);
      expect(isBrunoVariableDataType({})).toBe(false);
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
    it('returns false when dataType is missing', () => {
      expect(hasTypedMetadata({})).toBe(false);
    });

    it('returns false when dataType is the string default', () => {
      expect(hasTypedMetadata({ dataType: 'string' })).toBe(false);
    });

    it('returns true for non-string datatypes', () => {
      expect(hasTypedMetadata({ dataType: 'number' })).toBe(true);
      expect(hasTypedMetadata({ dataType: 'boolean' })).toBe(true);
      expect(hasTypedMetadata({ dataType: 'object' })).toBe(true);
    });
  });

  describe('toOpenCollectionTypedValue', () => {
    it('builds a {type, data} struct from dataType + stringified value', () => {
      expect(toOpenCollectionTypedValue({ dataType: 'number' }, '42'))
        .toEqual({ type: 'number', data: '42' });
      expect(toOpenCollectionTypedValue({ dataType: 'boolean' }, 'true'))
        .toEqual({ type: 'boolean', data: 'true' });
      expect(toOpenCollectionTypedValue({ dataType: 'object' }, '{"a":1}'))
        .toEqual({ type: 'object', data: '{"a":1}' });
    });

    it('falls back to type "string" when dataType is missing', () => {
      expect(toOpenCollectionTypedValue({}, 'hello'))
        .toEqual({ type: 'string', data: 'hello' });
    });
  });

  describe('fromOpenCollectionTypedValue', () => {
    it('coerces typed values to their declared dataType', () => {
      expect(fromOpenCollectionTypedValue({ type: 'number', data: '42' }))
        .toEqual({ value: 42, dataType: 'number' });
      expect(fromOpenCollectionTypedValue({ type: 'boolean', data: 'true' }))
        .toEqual({ value: true, dataType: 'boolean' });
      expect(fromOpenCollectionTypedValue({ type: 'object', data: '{"a":1}' }))
        .toEqual({ value: { a: 1 }, dataType: 'object' });
    });

    it('falls back to string when the declared type is unsupported (e.g. null)', () => {
      const result = fromOpenCollectionTypedValue({ type: 'null' as any, data: '' });
      expect(result.dataType).toBeUndefined();
    });

    it('coerces non-string data to a string before coercing by dataType', () => {
      const result = fromOpenCollectionTypedValue({ type: 'number', data: 42 as any });
      expect(result.value).toBe(42);
      expect(result.dataType).toBe('number');
    });

    it('returns the raw string when coercion fails (e.g. non-numeric @number)', () => {
      const result = fromOpenCollectionTypedValue({ type: 'number', data: 'not-a-number' });
      expect(result.value).toBe('not-a-number');
      expect(result.dataType).toBe('number');
    });
  });
});
