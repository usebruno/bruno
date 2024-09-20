const { describe, it, expect } = require('@jest/globals');

import { sanitizeName, validateName } from './regex';

describe('regex validators', () => {
  describe('sanitize name', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeName('hello world')).toBe('hello world');
      expect(sanitizeName('hello-world')).toBe('hello-world');
      expect(sanitizeName('hello_world')).toBe('hello_world');
      expect(sanitizeName('hello_world-')).toBe('hello_world-');
      expect(sanitizeName('hello_world-123')).toBe('hello_world-123');
      expect(sanitizeName('hello_world-123!@#$%^&*()')).toBe('hello_world-123!@#$%^&-()');
      expect(sanitizeName('hello_world?')).toBe('hello_world-');
      expect(sanitizeName('foo/bar/')).toBe('foo-bar-');
      expect(sanitizeName('foo\\bar\\')).toBe('foo-bar-');
    });

    it('should remove leading hyphens', () => {
      expect(sanitizeName('-foo')).toBe('foo');
      expect(sanitizeName('---foo')).toBe('foo');
      expect(sanitizeName('-foo-bar')).toBe('foo-bar');
    });

    it('should remove trailing periods', () => {
      expect(sanitizeName('file.')).toBe('file');
      expect(sanitizeName('file.name.')).toBe('file.name');
      expect(sanitizeName('hello world.')).toBe('hello world');
    });

    it('should handle filenames with only invalid characters', () => {
      expect(sanitizeName('<>:"/\\|?*')).toBe('');
      expect(sanitizeName('::::')).toBe('');
    });

    it('should handle filenames with a mix of valid and invalid characters', () => {
      expect(sanitizeName('test<>:"/\\|?*')).toBe('test---------');
      expect(sanitizeName('foo<bar>')).toBe('foo-bar-');
    });

    it('should remove control characters', () => {
      expect(sanitizeName('foo\x00bar')).toBe('foo-bar');
      expect(sanitizeName('file\x1Fname')).toBe('file-name');
    });

    it('should return an empty string if the name is empty or consists only of invalid characters', () => {
      expect(sanitizeName('')).toBe('');
      expect(sanitizeName('<>:"/\\|?*')).toBe('');
    });

    it('should handle filenames with multiple consecutive invalid characters', () => {
      expect(sanitizeName('foo<<bar')).toBe('foo--bar');
      expect(sanitizeName('test||name')).toBe('test--name');
    });

    it('should handle names with spaces only', () => {
      expect(sanitizeName('     ')).toBe('');
    });

    it('should handle names with leading/trailing spaces', () => {
      expect(sanitizeName('  foo bar  ')).toBe('foo bar');
    });

    it('should preserve valid non-ASCII characters', () => {
      expect(sanitizeName('brunó')).toBe('brunó');
      expect(sanitizeName('文件')).toBe('文件');
      expect(sanitizeName('brunfais')).toBe('brunfais');
      expect(sanitizeName('brunai')).toBe('brunai');
      expect(sanitizeName('brunsборка')).toBe('brunsборка');
      expect(sanitizeName('brunпривет')).toBe('brunпривет');
      expect(sanitizeName('🐶')).toBe('🐶');
      expect(sanitizeName('brunfais🐶')).toBe('brunfais🐶');
      expect(sanitizeName('file-🐶-bruno')).toBe('file-🐶-bruno');
      expect(sanitizeName('helló')).toBe('helló');
    });    

    it('should preserve case sensitivity', () => {
      expect(sanitizeName('FileName')).toBe('FileName');
      expect(sanitizeName('fileNAME')).toBe('fileNAME');
    });

    it('should handle filenames with multiple consecutive periods (only remove trailing)', () => {
      expect(sanitizeName('file.name...')).toBe('file.name');
      expect(sanitizeName('...file')).toBe('file');
      expect(sanitizeName('file.name...  ')).toBe('file.name');
      expect(sanitizeName('  ...file')).toBe('file');
      expect(sanitizeName('  ...file   ')).toBe('file');
      expect(sanitizeName('  ...file....   ')).toBe('file');
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(300) + '.txt';
      expect(sanitizeName(longName)).toBe(longName);
    });

    it('should handle names with leading/trailing invalid characters', () => {
      expect(sanitizeName('-foo/bar-')).toBe('foo-bar-');
      expect(sanitizeName('/foo\\bar/')).toBe('foo-bar-');
    });
    
  });
});

describe('sanitizeName and validateName', () => {
  it('should sanitize and then validate valid names', () => {
    const validNames = [
      'valid_filename.txt',
      '  valid name ',
      '   valid-name   ',
      'valid<>name.txt',
      'file/with?invalid*chars'
    ];

    validNames.forEach(name => {
      const sanitized = sanitizeName(name);
      expect(validateName(sanitized)).toBe(true);
    });
  });

  it('should sanitize and then validate names with reserved device names', () => {
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT2'];
    
    reservedNames.forEach(name => {
      const sanitized = sanitizeName(name);
      expect(validateName(sanitized)).toBe(false);
    });
  });

  it('should sanitize invalid names to empty strings', () => {
    const invalidNames = [
      '  <>:"/\\|?*  ',
      '   ...   ',
      '    ',
    ];

    invalidNames.forEach(name => {
      const sanitized = sanitizeName(name);
      expect(validateName(sanitized)).toBe(false);
    });
  });

  it('should return false for reserved device names with leading/trailing spaces', () => {
    const mixedNames = [
      'AUX   ',
      '   COM1   '
    ];

    mixedNames.forEach(name => {
      const sanitized = sanitizeName(name);
      expect(validateName(sanitized)).toBe(false);
    });
  });
});
