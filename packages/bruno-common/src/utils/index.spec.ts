import { flattenObject } from './index';

describe('flattenObject', () => {
  it('should flatten a simple object', () => {
    const input = { a: 1, b: { c: 2, d: { e: 3 } } };
    const output = flattenObject(input);
    expect(output).toEqual({ a: 1, 'b.c': 2, 'b.d.e': 3 });
  });

  it('should flatten an object with arrays', () => {
    const input = { a: 1, b: { c: [2, 3, 4], d: { e: 5 } } };
    const output = flattenObject(input);
    expect(output).toEqual({ a: 1, 'b.c[0]': 2, 'b.c[1]': 3, 'b.c[2]': 4, 'b.d.e': 5 });
  });

  it('should flatten an object with arrays having objects', () => {
    const input = { a: 1, b: { c: [{ d: 2 }, { e: 3 }], f: { g: 4 } } };
    const output = flattenObject(input);
    expect(output).toEqual({ a: 1, 'b.c[0].d': 2, 'b.c[1].e': 3, 'b.f.g': 4 });
  });

  it('should handle null values', () => {
    const input = { a: 1, b: { c: null, d: { e: 3 } } };
    const output = flattenObject(input);
    expect(output).toEqual({ a: 1, 'b.c': null, 'b.d.e': 3 });
  });

  it('should handle an empty object', () => {
    const input = {};
    const output = flattenObject(input);
    expect(output).toEqual({});
  });

  it('should handle an object with nested empty objects', () => {
    const input = { a: { b: {}, c: { d: {} } } };
    const output = flattenObject(input);
    expect(output).toEqual({});
  });

  it('should handle an object with duplicate keys - dot notation used to define the last duplicate key', () => {
    const input = { a: { b: 2 }, 'a.b': 1 };
    const output = flattenObject(input);
    expect(output).toEqual({ 'a.b': 1 });
  });

  it('should handle an object with duplicate keys - inner object used to define the last duplicate key', () => {
    const input = { 'a.b': 1, a: { b: 2 } };
    const output = flattenObject(input);
    expect(output).toEqual({ 'a.b': 2 });
  });
});
