import { describe, it, expect } from '@jest/globals';
import { patternHasher } from './template-hasher';

describe('patternHasher', () => {
  it('hashes and restore are mathematically reproducible', () => {
    const originalUrl = '{{host}}.example.com';
    const { hashed, restore } = patternHasher(originalUrl);
    expect(hashed).toMatchInlineSnapshot(`"bruno-var-hash--163450413.example.com"`);
    expect(restore(hashed)).toEqual(originalUrl);
  });

  it('hashes more than once', () => {
    const originalUrl = '{{host}}.example.{{new}}';
    const { hashed, restore } = patternHasher(originalUrl);
    expect(hashed).toMatchInlineSnapshot(`"bruno-var-hash--163450413.example.bruno-var-hash-652560383"`);
    expect(restore(hashed)).toEqual(originalUrl);
  });

  it('allows custom matchers', () => {
    const originalUrl = '$name.example.com';
    const { hashed, restore } = patternHasher(originalUrl, /\$(\w+)/);
    expect(hashed).toMatchInlineSnapshot(`"bruno-var-hash-180907786.example.com"`);
    expect(restore(hashed)).toEqual(originalUrl);
  });

  it('ignore unless matched', () => {
    const originalUrl = '$name.example.com';
    const { hashed, restore } = patternHasher(originalUrl);
    expect(hashed).toMatchInlineSnapshot(`"$name.example.com"`);
    expect(restore(hashed)).toEqual(originalUrl);
  });
});
