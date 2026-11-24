import { describe, it, expect } from '@jest/globals';
import { coerceEnvName } from './environments';

describe('coerceEnvName', () => {
  it.each([
    ['a plain name', 'dev', 'dev'],
    ['an integer', 123, '123'],
    ['zero', 0, '0'],
    ['a negative number', -1, '-1'],
    ['a decimal', 1.5, '1.5']
  ])('reads %s as text', (_label, name, expected) => {
    expect(coerceEnvName(name)).toBe(expected);
  });

  it.each([
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['undefined', undefined],
    ['null', null],
    ['a boolean', true],
    ['an object', {}],
    ['an array', ['dev']],
    ['NaN', NaN],
    ['Infinity', Infinity]
  ])('has no usable name for %s', (_label, name) => {
    expect(coerceEnvName(name)).toBeNull();
  });
});
