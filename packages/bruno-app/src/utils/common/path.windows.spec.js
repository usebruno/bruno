// Mock platform module for Windows before importing path utilities
jest.mock('platform', () => ({
  os: {
    family: 'Windows',
  },
}));

import { getRelativePath, getBasename, getAbsoluteFilePath } from './path';

describe('Path Utilities - Windows Platform', () => {
  describe('getRelativePath', () => {
    it('should return relative path between two directories', () => {
      expect(getRelativePath('C:\\Users\\John\\Projects', 'C:\\Users\\John\\Projects\\App')).toBe('App');
    });

    it('should return "." when both paths are the same', () => {
      expect(getRelativePath('C:\\Users\\John\\Projects', 'C:\\Users\\John\\Projects')).toBe('.');
    });

    it('should return parent directory path', () => {
      expect(getRelativePath('C:\\Users\\John\\Projects', 'C:\\Users\\John\\Docs\\readme.md', false)).toBe('..\\Docs\\readme.md');
    });

    it('should return nested subdirectory path', () => {
      expect(getRelativePath('C:\\Users\\John\\Projects', 'C:\\Users\\John\\Projects\\src\\components', false)).toBe('src\\components');
    });

    describe('with posixify enabled', () => {
      it('should convert backslashes to forward slashes', () => {
        expect(getRelativePath('C:\\Users\\John\\Projects', 'C:\\Users\\John\\Projects\\App')).toBe('App');
      });

      it('should convert parent directory path to posix format', () => {
        expect(getRelativePath('C:\\Users\\John\\Projects', 'C:\\Users\\John\\Docs\\readme.md')).toBe('../Docs/readme.md');
      });

      it('should convert nested subdirectory path to posix format', () => {
        expect(getRelativePath('C:\\Users\\John\\Projects', 'C:\\Users\\John\\Projects\\src\\components')).toBe('src/components');
      });

      it('should handle complex paths with posixify', () => {
        expect(getRelativePath('C:\\Users\\John\\Projects\\api', 'C:\\Users\\John\\Projects\\src\\utils\\common')).toBe('../src/utils/common');
      });

      it('should handle deep nested paths with posixify', () => {
        expect(getRelativePath('C:\\Users\\John\\Projects', 'C:\\Users\\John\\Projects\\src\\components\\ui\\forms')).toBe('src/components/ui/forms');
      });

      it('should handle paths with multiple backslashes', () => {
        expect(getRelativePath('C:\\Users\\John\\Projects', 'C:\\Users\\John\\Projects\\src\\\\components')).toBe('src/components');
      });
    });
  });

  describe('getBasename', () => {
    it('should return filename from relative path', () => {
      expect(getBasename('C:\\Users\\John\\Projects', '..\\Docs\\readme.md')).toBe('readme.md');
    });

    it('should return filename from subdirectory path', () => {
      expect(getBasename('C:\\Users\\John\\Projects', 'subfolder\\config.json')).toBe('config.json');
    });

    it('should return filename from direct file path', () => {
      expect(getBasename('C:\\Users\\John\\Projects', 'package.json')).toBe('package.json');
    });

    it('should return directory name for parent directory', () => {
      expect(getBasename('C:\\Users\\John\\Projects', '..')).toBe('John');
    });

    it('should return directory name for current directory', () => {
      expect(getBasename('C:\\Users\\John\\Projects', '.')).toBe('Projects');
    });

    it('should return filename from nested path', () => {
      expect(getBasename('C:\\Users\\John\\Projects', 'src\\components\\Button.jsx')).toBe('Button.jsx');
    });

    it('should return empty string for falsy relativePath', () => {
      expect(getBasename('C:\\Users\\John\\Projects', '')).toBe('');
      expect(getBasename('C:\\Users\\John\\Projects', null)).toBe('');
      expect(getBasename('C:\\Users\\John\\Projects', undefined)).toBe('');
    });

    it('should handle complex relative paths', () => {
      expect(getBasename('C:\\Users\\John\\Projects', '..\\..\\Docs\\api\\spec.md')).toBe('spec.md');
    });

    it('should handle paths with multiple extensions', () => {
      expect(getBasename('C:\\Users\\John\\Projects', 'src\\utils\\common\\path.spec.js')).toBe('path.spec.js');
    });
  });

  describe('getAbsoluteFilePath', () => {
    it('should resolve relative file path against collection path', () => {
      const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', 'config\\settings.json');
      expect(result).toBe('C:\\Users\\John\\Collections\\config\\settings.json');
    });

    it('should handle nested file paths', () => {
      const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', 'api\\v1\\users.json');
      expect(result).toBe('C:\\Users\\John\\Collections\\api\\v1\\users.json');
    });

    it('should handle parent directory references', () => {
      const result = getAbsoluteFilePath('C:\\Users\\John\\Collections\\api', '..\\shared\\config.json');
      expect(result).toBe('C:\\Users\\John\\Collections\\shared\\config.json');
    });

    it('should handle empty file path', () => {
      const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', '');
      expect(result).toBe('C:\\Users\\John\\Collections');
    });

    it('should handle current directory reference', () => {
      const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', '.');
      expect(result).toBe('C:\\Users\\John\\Collections');
    });

    it('should handle previous directory reference', () => {
      const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', '..');
      expect(result).toBe('C:\\Users\\John');
    });

    it('should handle root file path', () => {
      const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', 'D:\\absolute\\path\\file.json');
      expect(result).toBe('D:\\absolute\\path\\file.json');
    });

    it('should handle current directory reference', () => {
      const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', '.\\local-file.json');
      expect(result).toBe('C:\\Users\\John\\Collections\\local-file.json');
    });

    describe('with posixify enabled', () => {
      it('should convert backslashes to forward slashes in resolved path', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', 'config\\settings.json', true);
        expect(result).toBe('C:/Users/John/Collections/config/settings.json');
      });

      it('should handle nested file paths with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', 'api\\v1\\users.json', true);
        expect(result).toBe('C:/Users/John/Collections/api/v1/users.json');
      });

      it('should handle parent directory references with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Collections\\api', '..\\shared\\config.json', true);
        expect(result).toBe('C:/Users/John/Collections/shared/config.json');
      });

      it('should handle current directory reference with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', '.', true);
        expect(result).toBe('C:/Users/John/Collections');
      });

      it('should handle previous directory reference with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', '..', true);
        expect(result).toBe('C:/Users/John');
      });

      it('should handle root file path with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', 'D:\\absolute\\path\\file.json', true);
        expect(result).toBe('D:/absolute/path/file.json');
      });

      it('should handle current directory reference with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Collections', '.\\local-file.json', true);
        expect(result).toBe('C:/Users/John/Collections/local-file.json');
      });

      it('should handle complex nested paths with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', 'src\\components\\ui\\forms\\login.jsx', true);
        expect(result).toBe('C:/Users/John/Projects/src/components/ui/forms/login.jsx');
      });

      it('should handle paths with multiple backslashes with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', 'src\\\\components\\button.jsx', true);
        expect(result).toBe('C:/Users/John/Projects/src/components/button.jsx');
      });
    });
  });

  describe('Cross-platform path handling', () => {
    describe('Windows fromPath with POSIX toPath', () => {
      it('should handle Windows fromPath with POSIX toPath in getAbsoluteFilePath', () => {
        // This demonstrates the current behavior
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', 'App/config.json');
        expect(result).toBe('C:\\Users\\John\\Projects\\App\\config.json');
      });

      it('should handle Windows fromPath with mixed separators in getRelativePath', () => {
        const result = getRelativePath('C:\\Users\\John\\Projects', 'C:/Users/John/Projects/App');
        // This should work since both are Windows paths, just different separators
        expect(result).toBe('App');
      });

      it('should handle Windows fromPath with mixed separators in getAbsoluteFilePath', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', 'App/config.json');
        expect(result).toBe('C:\\Users\\John\\Projects\\App\\config.json');
      });

      it('should handle Windows fromPath with mixed separators in getAbsoluteFilePath', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', '../config.json');
        expect(result).toBe('C:\\Users\\John\\config.json');
      });
    });

    describe('Mixed path separators within same platform', () => {
      it('should handle mixed separators in Windows paths for getRelativePath', () => {
        const result = getRelativePath('C:/Users/John/Projects', 'C:\\Users\\John\\Projects\\App', false);
        expect(result).toBe('App');
      });

      it('should handle mixed separators in Windows paths for getAbsoluteFilePath', () => {
        const result = getAbsoluteFilePath('C:/Users/John/Projects', 'App\\config.json');
        expect(result).toBe('C:\\Users\\John\\Projects\\App\\config.json');
      });

      it('should handle mixed separators with posixify in getRelativePath', () => {
        const result = getRelativePath('C:/Users/John/Projects', 'C:\\Users\\John\\Projects\\App', true);
        expect(result).toBe('App');
      });

      it('should handle mixed separators with posixify in getAbsoluteFilePath', () => {
        const result = getAbsoluteFilePath('C:/Users/John/Projects', 'App\\config.json', true);
        expect(result).toBe('C:/Users/John/Projects/App/config.json');
      });
    });

    describe('Cross-platform with posixify', () => {
      it('should normalize cross-platform paths with posixify in getRelativePath', () => {
        const result = getRelativePath('C:\\Users\\John\\Projects', 'C:/Users/John/Projects/App', true);
        expect(result).toBe('App');
      });

      it('should normalize cross-platform paths with posixify in getAbsoluteFilePath', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', 'App/config.json', true);
        expect(result).toBe('C:/Users/John/Projects/App/config.json');
      });

      it('should handle complex mixed separators with posixify', () => {
        const result = getAbsoluteFilePath('C:/Users/John/Projects', 'src\\components/ui\\forms', true);
        expect(result).toBe('C:/Users/John/Projects/src/components/ui/forms');
      });

      it('should handle POSIX absolute paths with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', './absolute/path/file.json', true);
        expect(result).toBe('C:/Users/John/Projects/absolute/path/file.json');
      });

      it('should handle Windows absolute paths with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', '.\\absolute\\path\\file.json', true);
        expect(result).toBe('C:/Users/John/Projects/absolute/path/file.json');
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle very long paths', () => {
      const longPath = 'C:\\Users\\John\\Projects\\' + 'a'.repeat(100);
      const result = getBasename(longPath, 'file.txt');
      expect(result).toBe('file.txt');
    });

    it('should handle paths with special characters', () => {
      expect(getBasename('C:\\Users\\John\\Projects', 'file with spaces.txt')).toBe('file with spaces.txt');
      expect(getBasename('C:\\Users\\John\\Projects', 'file-with-dashes.txt')).toBe('file-with-dashes.txt');
      expect(getBasename('C:\\Users\\John\\Projects', 'file_with_underscores.txt')).toBe('file_with_underscores.txt');
    });

    it('should handle paths with unicode characters', () => {
      expect(getBasename('C:\\Users\\John\\Projects', 'файл.txt')).toBe('файл.txt');
      expect(getBasename('C:\\Users\\John\\Projects', '文件.txt')).toBe('文件.txt');
    });

    describe('with posixify enabled', () => {
      it('should handle very long paths with posixify', () => {
        const longPath = 'C:\\Users\\John\\Projects\\' + 'a'.repeat(100);
        const result = getAbsoluteFilePath(longPath, 'file.txt', true);
        expect(result).toBe(`C:/Users/John/Projects/${'a'.repeat(100)}/file.txt`);
      });

      it('should handle paths with special characters and posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', 'file with spaces.txt', true);
        expect(result).toBe('C:/Users/John/Projects/file with spaces.txt');
      });

      it('should handle paths with unicode characters and posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', 'файл.txt', true);
        expect(result).toBe('C:/Users/John/Projects/файл.txt');
      });

      it('should handle mixed path separators with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', 'src/components\\ui/forms', true);
        expect(result).toBe('C:/Users/John/Projects/src/components/ui/forms');
      });

      it('should handle empty relative path with posixify', () => {
        const result = getAbsoluteFilePath('C:\\Users\\John\\Projects', '', true);
        expect(result).toBe('C:/Users/John/Projects');
      });

      it('should handle relative path with posixify', () => {
        const result = getRelativePath('C:\\Users\\John\\Projects', 'C:\\Users\\John\\Projects\\файл.txt', true);
        expect(result).toBe('файл.txt');
      });
    });
  });
});
