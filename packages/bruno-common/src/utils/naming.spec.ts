import { describe, it, expect } from '@jest/globals';
import {
  sanitizeName,
  validateName,
  validateNameError,
  generateUniqueName,
  stripCopySuffix,
  nextCopyName
} from './naming';

describe('naming utils', () => {
  describe('sanitizeName', () => {
    it('preserves interior spaces', () => {
      expect(sanitizeName('my login request')).toBe('my login request');
    });

    it('replaces invalid characters with hyphens', () => {
      expect(sanitizeName('a/b:c*d')).toBe('a-b-c-d');
    });

    it('trims leading spaces/hyphens and trailing dots/spaces', () => {
      expect(sanitizeName('  -hello.  ')).toBe('hello');
    });

    it('keeps the "copy" suffix with its space', () => {
      expect(sanitizeName('source copy')).toBe('source copy');
    });
  });

  describe('validateName', () => {
    it('returns false for falsy input (guard) instead of throwing', () => {
      expect(validateName(undefined as unknown as string)).toBe(false);
      expect(validateName('')).toBe(false);
    });

    it('rejects names longer than 255 chars', () => {
      expect(validateName('a'.repeat(256))).toBe(false);
      expect(validateName('a'.repeat(255))).toBe(true);
    });

    it('rejects Windows reserved device names', () => {
      expect(validateName('CON')).toBe(false);
      expect(validateName('LPT1')).toBe(false);
    });

    it('rejects invalid characters and bad first/last chars', () => {
      expect(validateName('a/b')).toBe(false); // invalid char
      expect(validateName(' leading')).toBe(false); // leading space
      expect(validateName('-leading')).toBe(false); // leading hyphen
      expect(validateName('trailing.')).toBe(false); // trailing dot
    });

    it('accepts normal names (including interior spaces)', () => {
      expect(validateName('login')).toBe(true);
      expect(validateName('my login request')).toBe(true);
      expect(validateName('source copy')).toBe(true);
    });
  });

  describe('validateNameError', () => {
    it('messages for empty, too-long, reserved, and invalid char', () => {
      expect(validateNameError('')).toBe('Name cannot be empty.');
      expect(validateNameError('a'.repeat(256))).toBe('Name cannot exceed 255 characters.');
      expect(validateNameError('CON')).toBe('Name cannot be a reserved device name.');
      expect(validateNameError('a/b')).toContain('Special characters aren\'t allowed');
    });

    it('returns empty string for a valid name', () => {
      expect(validateNameError('login')).toBe('');
    });
  });

  describe('generateUniqueName', () => {
    it('keeps a free name unchanged', () => {
      expect(generateUniqueName('staging', () => false)).toBe('staging');
    });

    it('adds a copy suffix, numbered from the second copy', () => {
      const taken = ['staging', 'staging copy', 'staging copy 2'];

      expect(generateUniqueName('staging', (name) => taken.includes(name))).toBe('staging copy 3');
    });
  });

  describe('stripCopySuffix', () => {
    it('strips a single copy token', () => {
      expect(stripCopySuffix('Get Entity Details copy')).toBe('Get Entity Details');
    });

    it('strips a numbered copy token', () => {
      expect(stripCopySuffix('Get Entity Details copy 7')).toBe('Get Entity Details');
    });

    it('strips a run of stacked copy tokens', () => {
      expect(stripCopySuffix('Get Entity Details copy copy copy')).toBe('Get Entity Details');
      expect(stripCopySuffix('Get Entity Details copy 2 copy')).toBe('Get Entity Details');
    });

    it('leaves a name that only ends in a capitalised Copy alone', () => {
      expect(stripCopySuffix('Hard Copy')).toBe('Hard Copy');
    });

    it('leaves names without a trailing copy token alone', () => {
      expect(stripCopySuffix('login')).toBe('login');
      expect(stripCopySuffix('copy of login')).toBe('copy of login');
    });

    it('keeps the name when stripping would leave nothing', () => {
      expect(stripCopySuffix('copy')).toBe('copy');
      expect(stripCopySuffix('copy 2')).toBe('copy 2');
    });
  });

  describe('nextCopyName', () => {
    it('uses the plain copy name when it is free', () => {
      expect(nextCopyName('login', ['login'])).toBe('login copy');
    });

    it('numbers from 2 once the plain copy name is taken', () => {
      expect(nextCopyName('login', ['login', 'login copy'])).toBe('login copy 2');
    });

    it('shares the counter when cloning a copy instead of stacking tokens', () => {
      const siblings = ['login', 'login copy'];

      expect(nextCopyName('login copy', siblings)).toBe('login copy 2');
      expect(nextCopyName('login copy 2', [...siblings, 'login copy 2'])).toBe('login copy 3');
    });

    it('fills a gap in the numbering', () => {
      expect(nextCopyName('login', ['login', 'login copy 2'])).toBe('login copy');
      expect(nextCopyName('login', ['login', 'login copy', 'login copy 3'])).toBe('login copy 2');
    });

    it('counts siblings of any type as taken', () => {
      expect(nextCopyName('Users', ['Users', 'Users copy'])).toBe('Users copy 2');
    });

    it('compares sibling names case-sensitively', () => {
      expect(nextCopyName('login', ['login', 'login Copy'])).toBe('login copy');
    });
  });
});
