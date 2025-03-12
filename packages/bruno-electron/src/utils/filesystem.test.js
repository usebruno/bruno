const { sanitizeDirectoryName, isWSLPath, normalizeWSLPath, normalizeAndResolvePath } = require('./filesystem.js');

describe('sanitizeDirectoryName', () => {
  it('should replace invalid characters with hyphens', () => {
    const input = '<>:"/\\|?*\x00-\x1F';
    const expectedOutput = '------------';
    expect(sanitizeDirectoryName(input)).toEqual(expectedOutput);
  });

  it('should not modify valid directory names', () => {
    const input = 'my-directory';
    expect(sanitizeDirectoryName(input)).toEqual(input);
  });

  it('should replace multiple invalid characters with a single hyphen', () => {
    const input = 'my<>invalid?directory';
    const expectedOutput = 'my--invalid-directory';
    expect(sanitizeDirectoryName(input)).toEqual(expectedOutput);
  });

  it('should handle names with slashes', () => {
    const input = 'my/invalid/directory';
    const expectedOutput = 'my-invalid-directory';
    expect(sanitizeDirectoryName(input)).toEqual(expectedOutput);
  });
});

describe('WSL Path Utilities', () => {
  describe('isWSLPath', () => {
    it('should identify WSL paths starting with double backslash', () => {
      expect(isWSLPath('\\\\wsl.localhost\\Ubuntu\\home\\user')).toBe(true);
    });

    it('should identify WSL paths starting with double forward slash', () => {
      expect(isWSLPath('//wsl.localhost/Ubuntu/home/user')).toBe(true);
    });

    it('should identify WSL paths starting with /wsl.localhost/', () => {
      expect(isWSLPath('/wsl.localhost/Ubuntu/home/user')).toBe(true);
    });

    it('should identify WSL paths starting with \\wsl.localhost', () => {
      expect(isWSLPath('\\wsl.localhost\\Ubuntu\\home\\user')).toBe(true);
    });

    it('should return false for non-WSL paths', () => {
      expect(isWSLPath('C:\\Users\\user\\Documents')).toBe(false);
      expect(isWSLPath('/home/user/documents')).toBe(false);
      expect(isWSLPath('relative/path')).toBe(false);
    });
  });

  describe('normalizeWSLPath', () => {
    it('should convert forward slash WSL paths to backslash format', () => {
      const input = '/wsl.localhost/Ubuntu/home/user/file.txt';
      const expected = '\\\\wsl.localhost\\Ubuntu\\home\\user\\file.txt';
      expect(normalizeWSLPath(input)).toBe(expected);
    });

    it('should handle paths already in backslash format', () => {
      const input = '\\\\wsl.localhost\\Ubuntu\\home\\user\\file.txt';
      expect(normalizeWSLPath(input)).toBe(input);
    });

    it('should convert mixed slash formats to backslash format', () => {
      const input = '/wsl.localhost\\Ubuntu/home\\user/file.txt';
      const expected = '\\\\wsl.localhost\\Ubuntu\\home\\user\\file.txt';
      expect(normalizeWSLPath(input)).toBe(expected);
    });
  });

  describe('normalizeAndResolvePath with WSL paths', () => {
    it('should normalize WSL paths', () => {
      const input = '/wsl.localhost/Ubuntu/home/user/file.txt';
      const expected = '\\\\wsl.localhost\\Ubuntu\\home\\user\\file.txt';
      expect(normalizeAndResolvePath(input)).toBe(expected);
    });

    it('should handle already normalized WSL paths', () => {
      const input = '\\\\wsl.localhost\\Ubuntu\\home\\user\\file.txt';
      expect(normalizeAndResolvePath(input)).toBe(input);
    });
  });
});
