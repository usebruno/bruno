const convertersModule = require('../dist/cjs');
const { expect } = require('@jest/globals');

describe('Dist build imports test', () => {
  describe('CommonJS imports', () => {
    it('should handle default export correctly', async () => {
      expect(convertersModule).toBeDefined();
      expect(typeof convertersModule).toBe('object');
    });

    it('should verify all expected exports are available', async () => {
      // todo: test the export for the brunoToPostman and add it to the expectedExports array
      const expectedExports = ['postmanToBruno', 'postmanToBrunoEnvironment', 'openApiToBruno', 'insomniaToBruno'];
      
      expectedExports.forEach(exportName => {
        expect(convertersModule[exportName]).toBeDefined();
        expect(typeof convertersModule[exportName]).toBe('function');
      });
    });

    it('should handle missing exports gracefully', async () => {
      const nonExistentExport = 'nonExistentExport';
      
      expect(convertersModule[nonExistentExport]).toBeUndefined();
    });

    // todo: add tests for individual exports with minimal sample data
  });

  describe('ESM imports', () => {
    it('should handle default export correctly', async () => {
      const module = await import('../dist/esm/index.js');
      expect(module).toBeDefined();
      expect(typeof module).toBe('object');
    });

    it('should verify all expected exports are available', async () => {
      const module = await import('../dist/esm/index.js');
      // todo: test the export for the brunoToPostman and add it to the expectedExports array
      const expectedExports = ['postmanToBruno', 'postmanToBrunoEnvironment', 'openApiToBruno', 'insomniaToBruno'];
      
      expectedExports.forEach(exportName => {
        expect(module[exportName]).toBeDefined();
        expect(typeof module[exportName]).toBe('function');
      });
    });

    it('should handle missing exports gracefully', async () => {
      const module = await import('../dist/esm/index.js');
      const nonExistentExport = 'nonExistentExport';
      
      expect(module[nonExistentExport]).toBeUndefined();
    });

    // todo: add tests for individual exports with minimal sample data
  });
}); 