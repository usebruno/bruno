import { describe, it, expect } from '@jest/globals';
import { generateUidBasedOnHash, simpleHash } from './hash';

describe('simpleHash', () => {
  it('returns a base-36 unsigned 32-bit hash', () => {
    expect(simpleHash('')).toBe('0');
    expect(simpleHash('/Users/me/collections/petstore')).toBe('6vzxx9');
    expect(simpleHash('C:\\Users\\me\\mocks\\Mock Server.yml')).toBe('1fru2zp');
  });
});

describe('generateUidBasedOnHash', () => {
  it('pads the hash to a 21 character uid', () => {
    expect(generateUidBasedOnHash('')).toBe('000000000000000000000');
    expect(generateUidBasedOnHash('/Users/me/collections/petstore')).toBe('6vzxx9000000000000000');
    expect(generateUidBasedOnHash('C:\\Users\\me\\mocks\\Mock Server.yml')).toBe('1fru2zp00000000000000');
  });
});
