const { describe, it, expect } = require('@jest/globals');
const {
  buildConsolidatedScript,
  wrapInIIFE,
  processScript,
  escapeForTemplate,
  getLevelMetadata,
  fromExtractedHooks,
  HOOK_LEVEL
} = require('../src/runtime/hooks-consolidator');

describe('hooks-consolidator', () => {
  describe('HOOK_LEVEL constants', () => {
    it('should have correct level values', () => {
      expect(HOOK_LEVEL.COLLECTION).toBe('collection');
      expect(HOOK_LEVEL.FOLDER).toBe('folder');
      expect(HOOK_LEVEL.REQUEST).toBe('request');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(HOOK_LEVEL)).toBe(true);
    });
  });

  describe('escapeForTemplate', () => {
    it('should handle empty strings', () => {
      expect(escapeForTemplate('')).toBe('');
      expect(escapeForTemplate(null)).toBe('');
      expect(escapeForTemplate(undefined)).toBe('');
    });

    it('should escape backticks', () => {
      expect(escapeForTemplate('Hello `world`')).toBe('Hello \\`world\\`');
    });

    it('should escape template literals', () => {
      expect(escapeForTemplate('Value: ${value}')).toBe('Value: \\${value}');
    });

    it('should escape backslashes', () => {
      expect(escapeForTemplate('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should handle complex strings', () => {
      const input = 'const msg = `Hello ${name}\\n`;';
      const expected = 'const msg = \\`Hello \\${name}\\\\n\\`;';
      expect(escapeForTemplate(input)).toBe(expected);
    });
  });

  describe('processScript', () => {
    it('should return empty string for empty input', () => {
      expect(processScript('')).toBe('');
      expect(processScript(null)).toBe('');
      expect(processScript('   ')).toBe('');
    });

    it('should remove single-line comments by default', () => {
      const script = `
        // This is a comment
        const x = 1;
      `;
      const result = processScript(script);
      expect(result).not.toContain('This is a comment');
      expect(result).toContain('const x = 1');
    });

    it('should remove multi-line comments by default', () => {
      const script = `
        /* This is a
           multi-line comment */
        const x = 1;
      `;
      const result = processScript(script);
      expect(result).not.toContain('multi-line comment');
      expect(result).toContain('const x = 1');
    });

    it('should preserve script when removeComments is false', () => {
      const script = '// comment\nconst x = 1;';
      const result = processScript(script, false);
      expect(result).toContain('// comment');
    });
  });

  describe('wrapInIIFE', () => {
    it('should return empty string for empty script', () => {
      expect(wrapInIIFE('', 'collection')).toBe('');
      expect(wrapInIIFE('   ', 'collection')).toBe('');
      expect(wrapInIIFE(null, 'collection')).toBe('');
    });

    it('should wrap script in async IIFE', () => {
      const script = 'console.log("hello");';
      const result = wrapInIIFE(script, 'collection');
      expect(result).toContain('await (async () => {');
      expect(result).toContain('console.log("hello");');
      expect(result).toContain('})();');
    });

    it('should include level identifier', () => {
      const result = wrapInIIFE('const x = 1;', 'collection');
      expect(result).toContain('__hookLevel = \'collection\'');
      expect(result).toContain('COLLECTION HOOKS');
    });

    it('should include folder identifier when provided', () => {
      const result = wrapInIIFE('const x = 1;', 'folder', '/path/to/folder');
      expect(result).toContain('__hookLevel = \'folder:/path/to/folder\'');
      expect(result).toContain('FOLDER HOOKS');
      expect(result).toContain('/path/to/folder');
    });

    it('should include error handling', () => {
      const result = wrapInIIFE('const x = 1;', 'request');
      expect(result).toContain('try {');
      expect(result).toContain('} catch (__hookError)');
      expect(result).toContain('__consolidatedErrors.push');
      expect(result).toContain('__onHookError');
    });
  });

  describe('buildConsolidatedScript', () => {
    it('should return empty result for no hooks', () => {
      const result = buildConsolidatedScript({});
      expect(result.hasHooks).toBe(false);
      expect(result.script).toBe('');
      expect(result.levels).toHaveLength(0);
    });

    it('should handle collection hooks only', () => {
      const result = buildConsolidatedScript({
        collectionHooks: 'bru.hooks.http.onBeforeRequest(() => {});'
      });
      expect(result.hasHooks).toBe(true);
      expect(result.levels).toHaveLength(1);
      expect(result.levels[0].level).toBe(HOOK_LEVEL.COLLECTION);
      expect(result.script).toContain('COLLECTION HOOKS');
      expect(result.script).toContain('bru.hooks.http.onBeforeRequest');
    });

    it('should handle request hooks only', () => {
      const result = buildConsolidatedScript({
        requestHooks: 'bru.hooks.http.onAfterResponse(() => {});'
      });
      expect(result.hasHooks).toBe(true);
      expect(result.levels).toHaveLength(1);
      expect(result.levels[0].level).toBe(HOOK_LEVEL.REQUEST);
      expect(result.script).toContain('REQUEST HOOKS');
    });

    it('should handle multiple folder hooks', () => {
      const result = buildConsolidatedScript({
        folderHooks: [
          { folderPathname: '/folder1', hooks: 'const f1 = 1;' },
          { folderPathname: '/folder2', hooks: 'const f2 = 2;' }
        ]
      });
      expect(result.hasHooks).toBe(true);
      expect(result.levels).toHaveLength(2);
      expect(result.levels[0].level).toBe(HOOK_LEVEL.FOLDER);
      expect(result.levels[0].identifier).toBe('/folder1');
      expect(result.levels[1].identifier).toBe('/folder2');
      expect(result.script).toContain('/folder1');
      expect(result.script).toContain('/folder2');
    });

    it('should consolidate all levels in correct order', () => {
      const result = buildConsolidatedScript({
        collectionHooks: 'const collectionVar = "collection";',
        folderHooks: [
          { folderPathname: '/folder1', hooks: 'const folder1Var = "folder1";' },
          { folderPathname: '/folder2', hooks: 'const folder2Var = "folder2";' }
        ],
        requestHooks: 'const requestVar = "request";'
      });

      expect(result.hasHooks).toBe(true);
      expect(result.levels).toHaveLength(4);
      expect(result.levels[0].level).toBe(HOOK_LEVEL.COLLECTION);
      expect(result.levels[1].level).toBe(HOOK_LEVEL.FOLDER);
      expect(result.levels[2].level).toBe(HOOK_LEVEL.FOLDER);
      expect(result.levels[3].level).toBe(HOOK_LEVEL.REQUEST);

      // Verify order in script (collection before folders before request)
      const collectionIndex = result.script.indexOf('COLLECTION HOOKS');
      const folder1Index = result.script.indexOf('/folder1');
      const folder2Index = result.script.indexOf('/folder2');
      const requestIndex = result.script.indexOf('REQUEST HOOKS');

      expect(collectionIndex).toBeLessThan(folder1Index);
      expect(folder1Index).toBeLessThan(folder2Index);
      expect(folder2Index).toBeLessThan(requestIndex);
    });

    it('should skip empty folder hooks', () => {
      const result = buildConsolidatedScript({
        collectionHooks: 'const x = 1;',
        folderHooks: [
          { folderPathname: '/folder1', hooks: '' },
          { folderPathname: '/folder2', hooks: 'const y = 2;' },
          { folderPathname: '/folder3', hooks: '   ' }
        ]
      });

      expect(result.levels).toHaveLength(2);
      expect(result.levels[0].level).toBe(HOOK_LEVEL.COLLECTION);
      expect(result.levels[1].level).toBe(HOOK_LEVEL.FOLDER);
      expect(result.levels[1].identifier).toBe('/folder2');
    });

    it('should include error collection in script', () => {
      const result = buildConsolidatedScript({
        collectionHooks: 'const x = 1;'
      });
      expect(result.script).toContain('const __consolidatedErrors = []');
      expect(result.script).toContain('__hookResult');
    });

    it('should remove comments by default', () => {
      const result = buildConsolidatedScript({
        collectionHooks: '// This is a comment\nconst x = 1;'
      });
      expect(result.script).not.toContain('This is a comment');
      expect(result.script).toContain('const x = 1');
    });

    it('should preserve comments when removeComments is false', () => {
      const result = buildConsolidatedScript({
        collectionHooks: '// This is a comment\nconst x = 1;',
        removeComments: false
      });
      expect(result.script).toContain('This is a comment');
    });
  });

  describe('getLevelMetadata', () => {
    it('should return empty array for no hooks', () => {
      expect(getLevelMetadata({})).toHaveLength(0);
    });

    it('should include collection level', () => {
      const result = getLevelMetadata({ collectionHooks: 'const x = 1;' });
      expect(result).toHaveLength(1);
      expect(result[0].level).toBe(HOOK_LEVEL.COLLECTION);
      expect(result[0].identifier).toBe('root');
    });

    it('should include all levels', () => {
      const result = getLevelMetadata({
        collectionHooks: 'const x = 1;',
        folderHooks: [
          { folderPathname: '/folder1', hooks: 'const y = 2;' }
        ],
        requestHooks: 'const z = 3;'
      });

      expect(result).toHaveLength(3);
      expect(result[0].level).toBe(HOOK_LEVEL.COLLECTION);
      expect(result[1].level).toBe(HOOK_LEVEL.FOLDER);
      expect(result[1].identifier).toBe('/folder1');
      expect(result[2].level).toBe(HOOK_LEVEL.REQUEST);
    });
  });

  describe('fromExtractedHooks', () => {
    it('should handle empty input', () => {
      const result = fromExtractedHooks(null);
      expect(result.collectionHooks).toBe('');
      expect(result.folderHooks).toEqual([]);
      expect(result.requestHooks).toBe('');
      expect(result.removeComments).toBe(true);
    });

    it('should convert extracted hooks format', () => {
      const extracted = {
        collectionHooks: 'collection script',
        folderHooks: [
          { folderPathname: '/folder1', hooks: 'folder script' }
        ],
        requestHooks: 'request script'
      };

      const result = fromExtractedHooks(extracted);
      expect(result.collectionHooks).toBe('collection script');
      expect(result.folderHooks).toEqual(extracted.folderHooks);
      expect(result.requestHooks).toBe('request script');
      expect(result.removeComments).toBe(true);
    });
  });

  describe('integration: consolidated script execution simulation', () => {
    it('should generate valid JavaScript', () => {
      const config = {
        collectionHooks: `
          bru.hooks.http.onBeforeRequest((data) => {
            console.log('Collection beforeRequest');
          });
        `,
        folderHooks: [
          {
            folderPathname: '/api/users',
            hooks: `
              bru.hooks.http.onBeforeRequest((data) => {
                console.log('Folder beforeRequest');
              });
            `
          }
        ],
        requestHooks: `
          bru.hooks.http.onAfterResponse((data) => {
            console.log('Request afterResponse');
          });
        `
      };

      const result = buildConsolidatedScript(config);

      // The script should be syntactically valid (this is a basic check)
      expect(result.hasHooks).toBe(true);
      expect(result.script).toContain('__consolidatedErrors');
      expect(result.script).toContain('await (async () =>');
      expect(result.levels).toHaveLength(3);

      // Try to parse it (without executing) to verify syntax
      // Note: We can't actually execute it without the bru context
      expect(() => {
        // This will throw if syntax is invalid
        new Function('bru', '__onHookError', '__hookResult', result.script);
      }).not.toThrow();
    });
  });
});
