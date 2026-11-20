import { describe, it, expect } from '@jest/globals';
import { ensureString, toKeyValueObject, transformDescription } from '../../../src/postman/helpers/values';

describe('ensureString', () => {
  it.each([
    [undefined, ''],
    [null, ''],
    ['', ''],
    ['abc', 'abc'],
    [0, '0'],
    [false, 'false']
  ])('converts %p to %p', (value, expected) => {
    expect(ensureString(value)).toBe(expected);
  });

  it('returns the fallback for empty values', () => {
    expect(ensureString(null, null)).toBeNull();
    expect(ensureString('', 'HMAC-SHA1')).toBe('HMAC-SHA1');
  });

  it('serializes objects on one line', () => {
    expect(ensureString({ a: [1, 2] })).toBe('{"a":[1,2]}');
  });
});

describe('toKeyValueObject', () => {
  it('turns a key/value list into a lookup and skips malformed entries', () => {
    expect(toKeyValueObject([{ key: 'username', value: 'u' }, null, { value: 'no key' }])).toEqual({ username: 'u' });
  });

  it('returns a plain object as-is', () => {
    expect(toKeyValueObject({ username: 'u', password: 'p' })).toEqual({ username: 'u', password: 'p' });
  });

  it.each([undefined, null, 'basic'])('returns an empty object for %p', (entries) => {
    expect(toKeyValueObject(entries)).toEqual({});
  });
});

describe('transformDescription', () => {
  it.each([
    [undefined, ''],
    ['plain', 'plain'],
    [{ content: 'from object', type: 'text/plain' }, 'from object'],
    [{ content: null }, ''],
    [{ content: 42 }, '42'],
    [{ type: 'text/plain' }, '']
  ])('converts %p to %p', (description, expected) => {
    expect(transformDescription(description)).toBe(expected);
  });
});
