import { normalizePath } from './path';

describe('normalizePath', () => {
  describe('WSL paths', () => {
    it('should preserve WSL UNC paths', () => {
      const input = '\\\\wsl.localhost\\Ubuntu\\home\\user\\cert.pfx';
      expect(normalizePath(input)).toBe(input);
    });

    it('should normalize WSL paths with single backslash to UNC format', () => {
      const input = '\\wsl.localhost\\Ubuntu\\home\\user\\cert.pfx';
      const expected = '\\\\wsl.localhost\\Ubuntu\\home\\user\\cert.pfx';
      expect(normalizePath(input)).toBe(expected);
    });

    it('should normalize WSL paths with forward slashes to UNC format', () => {
      const input = '/wsl.localhost/Ubuntu/home/user/cert.pfx';
      const expected = '\\\\wsl.localhost\\Ubuntu\\home\\user\\cert.pfx';
      expect(normalizePath(input)).toBe(expected);
    });

    it('should not convert WSL paths to forward slashes', () => {
      const input = '\\wsl.localhost\\Ubuntu\\home\\user\\file.txt';
      const result = normalizePath(input);
      expect(result).not.toBe('/wsl.localhost/Ubuntu/home/user/file.txt');
    });
  });

  describe('non-WSL paths', () => {
    it('should normalize regular Windows paths', () => {
      const input = 'C:\\Users\\user\\Documents\\file.txt';
      const expected = 'C:/Users/user/Documents/file.txt';
      expect(normalizePath(input)).toBe(expected);
    });

    it('should normalize paths with double backslashes', () => {
      const input = 'C:\\\\Users\\\\user\\\\Documents\\\\file.txt';
      const expected = 'C:/Users/user/Documents/file.txt';
      expect(normalizePath(input)).toBe(expected);
    });

    it('should normalize relative Windows paths', () => {
      const input = '..\\..\\..\\Downloads\\test-certs\\test-certs\\private.key';
      const expected = '../../../Downloads/test-certs/test-certs/private.key';
      expect(normalizePath(input)).toBe(expected);
    });

    it('should handle Unix paths', () => {
      const input = '/home/user/documents/file.txt';
      expect(normalizePath(input)).toBe(input);
    });

    it('should handle null and undefined', () => {
      expect(normalizePath(null)).toBe(null);
      expect(normalizePath(undefined)).toBe(undefined);
    });
  });
}); 