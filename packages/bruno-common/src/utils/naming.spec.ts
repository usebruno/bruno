import { describe, it, expect } from '@jest/globals';
import {
  sanitizeName,
  validateName,
  validateNameError,
  nextSuffixedName
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

  describe('nextSuffixedName', () => {
    it('omits the suffix for n === 0', () => {
      expect(nextSuffixedName('login', 'bru', 0)).toBe('login.bru');
    });

    it('appends the counter before the extension', () => {
      expect(nextSuffixedName('login', 'bru', 2)).toBe('login2.bru');
    });

    it('handles folders (no extension)', () => {
      expect(nextSuffixedName('My Folder', '', 0)).toBe('My Folder');
      expect(nextSuffixedName('My Folder', '', 1)).toBe('My Folder1');
    });
  });
});
