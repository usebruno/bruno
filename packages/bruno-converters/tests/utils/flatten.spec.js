import { describe, it, expect } from '@jest/globals';
import { flattenObject } from '../../src/utils/flatten';

describe('flattenObject', () => {
  it('returns empty object for empty input object', () => {
    expect(flattenObject({})).toEqual({});
  });

  it('flattens a simple nested object', () => {
    const input = { user: { name: 'Tom', info: { id: 1 } } };
    expect(flattenObject(input)).toEqual({
      'user.name': 'Tom',
      'user.info.id': 1
    });
  });

  it('flattens arrays using JavaScript-style square bracket notation', () => {
    const input = { tags: ['a', 'b'], nums: [1, 2] };
    expect(flattenObject(input)).toEqual({
      'tags[0]': 'a',
      'tags[1]': 'b',
      'nums[0]': 1,
      'nums[1]': 2
    });
  });

  it('handles null and primitive leaves correctly', () => {
    const input = { a: null, b: true, c: 0, d: 'x' };
    expect(flattenObject(input)).toEqual({
      a: null,
      b: true,
      c: 0,
      d: 'x'
    });
  });

  it('flattens mixed nested objects and arrays', () => {
    const input = {
      user: { name: 'Tom', roles: ['admin', 'editor'] },
      list: [{ id: 1 }, { id: 2 }]
    };
    expect(flattenObject(input)).toEqual({
      'user.name': 'Tom',
      'user.roles[0]': 'admin',
      'user.roles[1]': 'editor',
      'list[0].id': 1,
      'list[1].id': 2
    });
  });

  it('ignores empty arrays/objects (no keys produced for empty containers)', () => {
    const input = { emptyObj: {}, emptyArr: [] };
    expect(flattenObject(input)).toEqual({});
  });
});
