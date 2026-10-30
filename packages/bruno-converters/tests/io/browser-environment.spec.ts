import { importPostmanToBruno, writeCollectionToDisk, writeCollectionToDiskLegacy } from '../../src/io';

// Mirrors browser bundlers that polyfill Node built-ins by resolving `node:fs` to an empty module.
jest.mock('node:fs', () => ({}));

describe('io methods in a browser environment', () => {
  const collection = { version: '1', uid: 'c1', name: 'Collection', items: [] } as any;

  it('rejects writeCollectionToDisk', async () => {
    await expect(writeCollectionToDisk(collection, '/tmp/out'))
      .rejects.toThrow('writeCollectionToDisk is not supported in browser environment');
  });

  it('rejects writeCollectionToDiskLegacy', async () => {
    await expect(writeCollectionToDiskLegacy(collection, '/tmp/out', { format: 'bru' }))
      .rejects.toThrow('writeCollectionToDiskLegacy is not supported in browser environment');
  });

  it('rejects importPostmanToBruno before converting', async () => {
    await expect(importPostmanToBruno({}, '/tmp/out'))
      .rejects.toThrow('importPostmanToBruno is not supported in browser environment');
  });
});
