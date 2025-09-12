// Mock platform module for Unix before importing path utilities
jest.mock('platform', () => ({
  os: {
    family: 'Unix',
  },
}));

import { getRelativePath, getBasename, getAbsoluteFilePath } from './path';

describe('Path Utilities - Unix Platform', () => {
  describe('getRelativePath', () => {
    it('should return relative path between two directories', () => {
      expect(getRelativePath('/users/john/projects', '/users/john/projects/app')).toBe('app');
    });

    it('should return "." when both paths are the same', () => {
      expect(getRelativePath('/users/john/projects', '/users/john/projects')).toBe('.');
    });

    it('should return parent directory path', () => {
      expect(getRelativePath('/users/john/projects', '/users/john/docs/readme.md')).toBe('../docs/readme.md');
    });

    it('should return nested subdirectory path', () => {
      expect(getRelativePath('/users/john/projects', '/users/john/projects/src/components')).toBe('src/components');
    });

    it('should handle null/undefined inputs', () => {
      expect(getRelativePath(null, '/users/john/projects')).toBe('/users/john/projects');
      expect(getRelativePath(undefined, '/users/john/projects')).toBe('/users/john/projects');
    });
  });

  describe('getBasename', () => {
    it('should return filename from relative path', () => {
      expect(getBasename('/users/john/projects', '../docs/readme.md')).toBe('readme.md');
    });

    it('should return filename from subdirectory path', () => {
      expect(getBasename('/users/john/projects', 'subfolder/config.json')).toBe('config.json');
    });

    it('should return filename from direct file path', () => {
      expect(getBasename('/users/john/projects', 'package.json')).toBe('package.json');
    });

    it('should return directory name for parent directory', () => {
      expect(getBasename('/users/john/projects', '..')).toBe('john');
    });

    it('should return directory name for current directory', () => {
      expect(getBasename('/users/john/projects', '.')).toBe('projects');
    });

    it('should return filename from nested path', () => {
      expect(getBasename('/users/john/projects', 'src/components/Button.jsx')).toBe('Button.jsx');
    });

    it('should return empty string for falsy relativePath', () => {
      expect(getBasename('/users/john/projects', '')).toBe('');
      expect(getBasename('/users/john/projects', null)).toBe('');
      expect(getBasename('/users/john/projects', undefined)).toBe('');
    });

    it('should handle complex relative paths', () => {
      expect(getBasename('/users/john/projects', '../../docs/api/spec.md')).toBe('spec.md');
    });

    it('should handle paths with multiple extensions', () => {
      expect(getBasename('/users/john/projects', 'src/utils/common/path.spec.js')).toBe('path.spec.js');
    });
  });

  describe('getAbsoluteFilePath', () => {
    it('should resolve relative file path against collection path', () => {
      const result = getAbsoluteFilePath('/users/john/collections', 'config/settings.json');
      expect(result).toBe('/users/john/collections/config/settings.json');
    });

    it('should handle nested file paths', () => {
      const result = getAbsoluteFilePath('/users/john/collections', 'api/v1/users.json');
      expect(result).toBe('/users/john/collections/api/v1/users.json');
    });

    it('should handle parent directory references', () => {
      const result = getAbsoluteFilePath('/users/john/collections/api', '../shared/config.json');
      expect(result).toBe('/users/john/collections/shared/config.json');
    });

    it('should handle empty file path', () => {
      const result = getAbsoluteFilePath('/users/john/collections', '');
      expect(result).toBe('/users/john/collections');
    });

    it('should handle current directory reference', () => {
      const result = getAbsoluteFilePath('/users/john/collections', '.');
      expect(result).toBe('/users/john/collections');
    });

    it('should handle previous directory reference', () => {
      const result = getAbsoluteFilePath('/users/john/collections', '..');
      expect(result).toBe('/users/john');
    });

    it('should handle root file path', () => {
      const result = getAbsoluteFilePath('/users/john/collections', '/absolute/path/file.json');
      expect(result).toBe('/absolute/path/file.json');
    });

    it('should handle current directory reference', () => {
      const result = getAbsoluteFilePath('/users/john/collections', './local-file.json');
      expect(result).toBe('/users/john/collections/local-file.json');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long paths', () => {
      const longPath = '/users/john/projects/' + 'a'.repeat(100);
      const result = getBasename(longPath, 'file.txt');
      expect(result).toBe('file.txt');
    });

    it('should handle paths with special characters', () => {
      expect(getBasename('/users/john/projects', 'file with spaces.txt')).toBe('file with spaces.txt');
      expect(getBasename('/users/john/projects', 'file-with-dashes.txt')).toBe('file-with-dashes.txt');
      expect(getBasename('/users/john/projects', 'file_with_underscores.txt')).toBe('file_with_underscores.txt');
    });

    it('should handle paths with unicode characters', () => {
      expect(getBasename('/users/john/projects', 'файл.txt')).toBe('файл.txt');
      expect(getBasename('/users/john/projects', '文件.txt')).toBe('文件.txt');
    });
  });
});
