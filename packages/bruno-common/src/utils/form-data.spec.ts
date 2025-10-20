import { describe, it, expect } from '@jest/globals';
import { buildFormUrlEncodedPayload } from './form-data';

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
