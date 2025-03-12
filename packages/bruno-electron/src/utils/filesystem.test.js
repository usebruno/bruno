const { sanitizeDirectoryName } = require('./filesystem.js');

describe('sanitizeDirectoryName', () => {
  it('should replace invalid characters with hyphens', () => {
    const input = '<>:"/\|?*\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F';
    const expectedOutput = '----------------------------------------';
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
