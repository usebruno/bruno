import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

describe('openCollectionToBruno (import): keeps the collection version', () => {
  it('keeps the version as-is when importing', () => {
    const { brunoConfig } = openCollectionToBruno({ opencollection: '1.0.0', info: { name: 'API', version: 'v2.3.4' } });
    expect(brunoConfig.collectionVersion).toBe('v2.3.4');
  });

  it('turns a number version into text (2 becomes "2")', () => {
    const { brunoConfig } = openCollectionToBruno({ opencollection: '1.0.0', info: { name: 'API', version: 2 } });
    expect(brunoConfig.collectionVersion).toBe('2');
  });

  it('has no version when the imported file has none', () => {
    const { brunoConfig } = openCollectionToBruno({ opencollection: '1.0.0', info: { name: 'API' } });
    expect(brunoConfig.collectionVersion).toBeUndefined();
  });
});

describe('brunoToOpenCollection (export): writes the collection version', () => {
  it('uses the bru version (collectionVersion) for a bru collection', () => {
    const oc = brunoToOpenCollection({ name: 'API', brunoConfig: { version: '1', collectionVersion: 'v2.3.4' }, items: [] });
    expect(oc.info.version).toBe('v2.3.4');
  });

  it('uses the yml version (info.version) for a yml collection', () => {
    const oc = brunoToOpenCollection({ name: 'API', brunoConfig: { opencollection: '1.0.0', version: 'v9.9' }, items: [] });
    expect(oc.info.version).toBe('v9.9');
  });

  it('writes no version when the collection has none', () => {
    const oc = brunoToOpenCollection({ name: 'API', brunoConfig: {}, items: [] });
    expect(oc.info.version).toBeUndefined();
  });
});

describe('collection version: export then import keeps it the same', () => {
  it('keeps the same version after exporting and importing again', () => {
    const oc = brunoToOpenCollection({ name: 'API', brunoConfig: { collectionVersion: '1.2.3-beta' }, items: [] });
    const { brunoConfig } = openCollectionToBruno(oc);
    expect(brunoConfig.collectionVersion).toBe('1.2.3-beta');
  });
});
