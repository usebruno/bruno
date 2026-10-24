import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

const syncConfig = {
  sourceUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
  groupBy: 'tags',
  lastSyncDate: '2026-08-13T10:00:00.000Z',
  specHash: 'd41d8cd98f00b204e9800998ecf8427e',
  autoCheck: false,
  autoCheckInterval: 15
};

describe('brunoToOpenCollection (export): openapi sync config', () => {
  it('writes the sync config under extensions.bruno.openapi', () => {
    const oc = brunoToOpenCollection({
      name: 'Petstore',
      brunoConfig: { openapi: [syncConfig] },
      items: []
    });
    expect(oc.extensions?.bruno?.openapi).toEqual([syncConfig]);
  });

  it('writes nothing when the collection has no sync config', () => {
    const withoutKey = brunoToOpenCollection({ name: 'API', brunoConfig: {}, items: [] });
    const withEmptyList = brunoToOpenCollection({ name: 'API', brunoConfig: { openapi: [] }, items: [] });
    expect(withoutKey.extensions?.bruno?.openapi).toBeUndefined();
    expect(withEmptyList.extensions?.bruno?.openapi).toBeUndefined();
  });

  it('skips malformed entries and keeps the usable ones', () => {
    const oc = brunoToOpenCollection({
      name: 'Petstore',
      brunoConfig: { openapi: [null, 'https://example.com/openapi.json', syncConfig] },
      items: []
    });
    expect(oc.extensions.bruno.openapi).toEqual([syncConfig]);
  });

  it('omits sync metadata that is absent and defaults the auto-check fields', () => {
    const oc = brunoToOpenCollection({
      name: 'Petstore',
      brunoConfig: { openapi: [{ sourceUrl: 'https://example.com/openapi.json', groupBy: 'path' }] },
      items: []
    });
    expect(oc.extensions.bruno.openapi).toEqual([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'path',
        autoCheck: true,
        autoCheckInterval: 5
      }
    ]);
  });
});

describe('openCollectionToBruno (import): openapi sync config', () => {
  it('reads the sync config back, defaulting the auto-check fields', () => {
    const { brunoConfig } = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'Petstore' },
      extensions: { bruno: { openapi: [{ sourceUrl: 'https://example.com/openapi.json', groupBy: 'tags' }] } }
    });
    expect(brunoConfig.openapi).toEqual([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'tags',
        autoCheck: true,
        autoCheckInterval: 5
      }
    ]);
  });

  it('skips malformed entries and keeps the usable ones', () => {
    const { brunoConfig } = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'Petstore' },
      extensions: { bruno: { openapi: [null, 'https://example.com/openapi.json', syncConfig] } }
    });
    expect(brunoConfig.openapi).toEqual([syncConfig]);
  });

  it('leaves the collection unlinked when the file carries no sync config', () => {
    const { brunoConfig } = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' }
    });
    expect(brunoConfig.openapi).toBeUndefined();
  });
});

describe('openapi sync config: export then import keeps it the same', () => {
  it('preserves the sync config across a round trip', () => {
    const oc = brunoToOpenCollection({
      name: 'Petstore',
      brunoConfig: { openapi: [syncConfig] },
      items: []
    });
    const { brunoConfig } = openCollectionToBruno(oc);
    expect(brunoConfig.openapi).toEqual([syncConfig]);
  });
});
