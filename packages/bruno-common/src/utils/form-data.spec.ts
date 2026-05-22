import { describe, it, expect } from '@jest/globals';
import { buildFormUrlEncodedPayload, isFormData, extractBoundaryFromContentType, shouldUseMultipartFormData } from './form-data';
import FormData from 'form-data';

describe('buildFormUrlEncodedPayload', () => {
  it('should handle single key-value pair', () => {
    const requestObj = [{ name: 'item', value: 2 }];
    const expected = 'item=2';
    const result = buildFormUrlEncodedPayload(requestObj);
    expect(result).toEqual(expected);
  });

  it('should handle multiple key-value pairs with unique keys', () => {
    const requestObj = [
      { name: 'item1', value: 2 },
      { name: 'item2', value: 3 }
    ];
    const expected = 'item1=2&item2=3';
    const result = buildFormUrlEncodedPayload(requestObj);
    expect(result).toEqual(expected);
  });

  it('should handle multiple key-value pairs with the same key', () => {
    const requestObj = [
      { name: 'item', value: 2 },
      { name: 'item', value: 3 }
    ];
    const expected = 'item=2&item=3';
    const result = buildFormUrlEncodedPayload(requestObj);
    expect(result).toEqual(expected);
  });

  it('should handle mixed key-value pairs with unique and duplicate keys', () => {
    const requestObj = [
      { name: 'item1', value: 2 },
      { name: 'item2', value: 3 },
      { name: 'item1', value: 4 }
    ];
    const expected = 'item1=2&item2=3&item1=4';
    const result = buildFormUrlEncodedPayload(requestObj);
    expect(result).toEqual(expected);
  });

  it('should handle empty array', () => {
    const result = buildFormUrlEncodedPayload([]);
    expect(result).toEqual('');
  });

  it('should handle array with undefined and null values', () => {
    const requestObj = [
      { name: 'item1', value: undefined },
      { name: 'item2', value: null as any },
      { name: 'item3', value: '' },
      { name: 'item4', value: 0 }
    ];
    const expected = 'item1=&item2=&item3=&item4=0';
    const result = buildFormUrlEncodedPayload(requestObj);
    expect(result).toEqual(expected);
  });

  it('should handle array with special characters in names and values', () => {
    const requestObj = [
      { name: 'item with spaces', value: 'value with spaces' },
      { name: 'item&special', value: 'value&special' },
      { name: 'item=equals', value: 'value=equals' },
      { name: 'item%percent', value: 'value%percent' }
    ];
    const expected = 'item+with+spaces=value+with+spaces&item%26special=value%26special&item%3Dequals=value%3Dequals&item%25percent=value%25percent';
    const result = buildFormUrlEncodedPayload(requestObj);
    expect(result).toEqual(expected);
  });

  it('should handle array with numeric and boolean values', () => {
    const requestObj = [
      { name: 'number', value: 42 },
      { name: 'float', value: 3.14 },
      { name: 'boolean_true', value: true },
      { name: 'boolean_false', value: false }
    ];
    const expected = 'number=42&float=3.14&boolean_true=true&boolean_false=false';
    const result = buildFormUrlEncodedPayload(requestObj);
    expect(result).toEqual(expected);
  });

  it('should preserve parameter order in array format', () => {
    const requestObj = [
      { name: 'z', value: '1' },
      { name: 'a', value: '2' },
      { name: 'm', value: '3' }
    ];
    const expected = 'z=1&a=2&m=3';
    const result = buildFormUrlEncodedPayload(requestObj);
    expect(result).toEqual(expected);
  });

  it('should ignore invalid items inside params array', () => {
    const requestObj: any[] = [
      { name: 'item1', value: 'a' },
      'not-an-object',
      { value: 'missingName' },
      42,
      { name: 'item2', value: 'b' },
      { name: 'item3' }, // missing value should default to empty string
      null,
      undefined,
      { name: '', value: 'empty_name' }, // empty name should still work
      { name: 'valid', value: 'c' }
    ];
    const expected = 'item1=a&item2=b&item3=&=empty_name&valid=c';
    const result = buildFormUrlEncodedPayload(requestObj);
    expect(result).toEqual(expected);
  });
});

describe('isFormData', () => {
  it('should return true for objects with FormData constructor name', () => {
    const mockFormData = {
      constructor: { name: 'FormData' }
    };
    expect(isFormData(mockFormData)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isFormData(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isFormData(undefined)).toBe(false);
  });

  it('should return false for plain objects', () => {
    expect(isFormData({})).toBe(false);
    expect(isFormData({ key: 'value' })).toBe(false);
  });

  it('should return false for arrays', () => {
    expect(isFormData([])).toBe(false);
    expect(isFormData([1, 2, 3])).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isFormData('string')).toBe(false);
    expect(isFormData(123)).toBe(false);
    expect(isFormData(true)).toBe(false);
  });

  it('should return false for objects with different constructor names', () => {
    class CustomClass {}
    const customObj = new CustomClass();
    expect(isFormData(customObj)).toBe(false);
  });

  it('should return false for objects without constructor', () => {
    const obj = Object.create(null);
    expect(isFormData(obj)).toBe(false);
  });

  it('should return true for actual FormData instance from form-data library', () => {
    const formData = new FormData();
    formData.append('key', 'value');
    expect(isFormData(formData)).toBe(true);
  });
});

describe('extractBoundaryFromContentType', () => {
  it('should extract boundary from Content-Type header', () => {
    expect(extractBoundaryFromContentType('multipart/mixed; boundary=my-boundary')).toBe('my-boundary');
  });

  it('should extract boundary with dashes', () => {
    expect(extractBoundaryFromContentType('multipart/mixed; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW')).toBe('----WebKitFormBoundary7MA4YWxkTrZu0gW');
  });

  it('should extract boundary case-insensitively', () => {
    expect(extractBoundaryFromContentType('multipart/mixed; BOUNDARY=my-boundary')).toBe('my-boundary');
    expect(extractBoundaryFromContentType('multipart/mixed; Boundary=my-boundary')).toBe('my-boundary');
  });

  it('should extract boundary when other params exist', () => {
    expect(extractBoundaryFromContentType('multipart/mixed; charset=utf-8; boundary=my-boundary')).toBe('my-boundary');
    expect(extractBoundaryFromContentType('multipart/mixed; boundary=my-boundary; charset=utf-8')).toBe('my-boundary');
  });

  it('should return null when no boundary exists', () => {
    expect(extractBoundaryFromContentType('multipart/mixed')).toBeNull();
    expect(extractBoundaryFromContentType('application/json')).toBeNull();
  });

  it('should return null for non-string input', () => {
    expect(extractBoundaryFromContentType(null)).toBeNull();
    expect(extractBoundaryFromContentType(undefined)).toBeNull();
    expect(extractBoundaryFromContentType(123)).toBeNull();
    expect(extractBoundaryFromContentType({})).toBeNull();
  });

  it('should handle empty string', () => {
    expect(extractBoundaryFromContentType('')).toBeNull();
  });

  it('should extract boundary from quoted value', () => {
    expect(extractBoundaryFromContentType('multipart/mixed; boundary="my-boundary"')).toBe('my-boundary');
  });

  it('should extract quoted boundary with spaces', () => {
    expect(extractBoundaryFromContentType('multipart/mixed; boundary="my boundary value"')).toBe('my boundary value');
  });

  it('should extract quoted boundary when other params exist', () => {
    expect(extractBoundaryFromContentType('multipart/mixed; charset=utf-8; boundary="my-boundary"')).toBe('my-boundary');
  });
});

describe('shouldUseMultipartFormData', () => {
  // Regression coverage for https://github.com/usebruno/bruno/issues/7995
  // Bruno v3.2.0+ silently dropped raw multipart/mixed bodies because the multipart
  // wrap path was entered even when request.data was already a serialized string.
  // This predicate is the gate that prevents that.

  it('returns true for an array of form fields (multipartForm body mode)', () => {
    const data = [
      { name: 'description', value: 'value1', type: 'text' },
      { name: 'attachment', value: ['file.pdf'], type: 'file' }
    ];
    expect(shouldUseMultipartFormData(data)).toBe(true);
  });

  it('returns true for an empty array (empty multipart form is still a form)', () => {
    expect(shouldUseMultipartFormData([])).toBe(true);
  });

  it('returns false for a raw multipart/mixed body string (text body mode)', () => {
    const rawMultipartBody = [
      '--TestBoundary123',
      'Content-Type: application/json',
      '',
      '{"test": true}',
      '--TestBoundary123--',
      ''
    ].join('\r\n');
    expect(shouldUseMultipartFormData(rawMultipartBody)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(shouldUseMultipartFormData('')).toBe(false);
  });

  it('returns false for a JSON-serialized string (json body mode)', () => {
    expect(shouldUseMultipartFormData('{"a":1}')).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(shouldUseMultipartFormData(null)).toBe(false);
    expect(shouldUseMultipartFormData(undefined)).toBe(false);
  });

  it('returns false for a plain object', () => {
    expect(shouldUseMultipartFormData({})).toBe(false);
    expect(shouldUseMultipartFormData({ name: 'x', value: 'y' })).toBe(false);
  });

  it('returns false for primitive numbers and booleans', () => {
    expect(shouldUseMultipartFormData(0)).toBe(false);
    expect(shouldUseMultipartFormData(42)).toBe(false);
    expect(shouldUseMultipartFormData(true)).toBe(false);
    expect(shouldUseMultipartFormData(false)).toBe(false);
  });

  it('returns false for an already-wrapped FormData instance', () => {
    const formData = new FormData();
    formData.append('key', 'value');
    expect(shouldUseMultipartFormData(formData)).toBe(false);
  });

  it('returns false for a Buffer (binary body mode)', () => {
    const buffer = Buffer.from('binary content');
    expect(shouldUseMultipartFormData(buffer)).toBe(false);
  });
});
