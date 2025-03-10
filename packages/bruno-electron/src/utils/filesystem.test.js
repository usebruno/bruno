const { sanitizeDirectoryName } = require('./filesystem.js');

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
