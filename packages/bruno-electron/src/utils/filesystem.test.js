const { sanitizeName, isWSLPath, normalizeWSLPath, normalizeAndResolvePath, isLargeFile } = require('./filesystem.js');
const fs = require('fs-extra');

describe('sanitizeName', () => {
  it('should replace invalid characters with hyphens', () => {
    expect(sanitizeName(
      'valid<>:"/\|?*\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F'
    )).toEqual('valid----------------------------------------');

    expect(sanitizeName(
      '<>:"/\|?*\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1Fvalid<>:"/\|?*\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F'
    )).toEqual('valid----------------------------------------');
  });

  it('should not modify valid directory names', () => {
    const input = 'my-directory';
    expect(sanitizeName(input)).toEqual(input);
  });

  it('should replace multiple invalid characters with a single hyphen', () => {
    const input = 'my<>invalid?directory';
    const expectedOutput = 'my--invalid-directory';
    expect(sanitizeName(input)).toEqual(expectedOutput);
  });

  it('should handle names with slashes', () => {
    const input = 'my/invalid/directory';
    const expectedOutput = 'my-invalid-directory';
    expect(sanitizeName(input)).toEqual(expectedOutput);
  });
});

describe('isLargeFile', () => {
  let existsSyncSpy;
  let lstatSyncSpy;
  let statSyncSpy;

  beforeEach(() => {
    existsSyncSpy = jest.spyOn(fs, 'existsSync');
    lstatSyncSpy = jest.spyOn(fs, 'lstatSync');
    statSyncSpy = jest.spyOn(fs, 'statSync');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return false when file size is below default threshold (10MB)', () => {
    existsSyncSpy.mockReturnValue(true);
    lstatSyncSpy.mockReturnValue({ isFile: () => true });
    statSyncSpy.mockReturnValue({ size: 5 * 1024 * 1024 }); // 5MB

    expect(isLargeFile('/path/small.bin')).toBe(false);
  });

  it('should return true when file size is above default threshold (10MB)', () => {
    existsSyncSpy.mockReturnValue(true);
    lstatSyncSpy.mockReturnValue({ isFile: () => true });
    statSyncSpy.mockReturnValue({ size: 15 * 1024 * 1024 }); // 15MB

    expect(isLargeFile('/path/large.bin')).toBe(true);
  });

  it('should respect custom threshold (args true or false)', () => {
    existsSyncSpy.mockReturnValue(true);
    lstatSyncSpy.mockReturnValue({ isFile: () => true });
    statSyncSpy.mockReturnValue({ size: 50 });

    expect(isLargeFile('/path/file.bin', 100)).toBe(false); // 50 < 100
    expect(isLargeFile('/path/file.bin', 10)).toBe(true); // 50 > 10
  });

  it('should throw on invalid values (not a file)', () => {
    existsSyncSpy.mockReturnValue(false);
    lstatSyncSpy.mockReturnValue({ isFile: () => false });

    expect(() => isLargeFile('/path/not-a-file.bin')).toThrow('File /path/not-a-file.bin is not a file');
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
