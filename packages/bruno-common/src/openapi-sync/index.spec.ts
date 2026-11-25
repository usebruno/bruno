import { describe, it, expect } from '@jest/globals';
import { normalizeOpenApiSyncConfigs } from './index';

describe('normalizeOpenApiSyncConfigs', () => {
  it('keeps the sync metadata without adding auto check settings', () => {
    expect(normalizeOpenApiSyncConfigs([
      { sourceUrl: 'https://example.com/openapi.json', groupBy: 'tags' }
    ])).toEqual([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'tags'
      }
    ]);
  });

  it('keeps auto check settings an older file already has', () => {
    expect(normalizeOpenApiSyncConfigs([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'path',
        lastSyncDate: '2026-08-13T10:00:00.000Z',
        specHash: 'd41d8cd98f00b204e9800998ecf8427e',
        autoCheck: false,
        autoCheckInterval: 30
      }
    ])).toEqual([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'path',
        lastSyncDate: '2026-08-13T10:00:00.000Z',
        specHash: 'd41d8cd98f00b204e9800998ecf8427e',
        autoCheck: false,
        autoCheckInterval: 30
      }
    ]);
  });

  it('drops auto check settings that are not a boolean and a number', () => {
    expect(normalizeOpenApiSyncConfigs([
      { sourceUrl: 'https://example.com/openapi.json', autoCheck: 'yes', autoCheckInterval: '5' }
    ])).toEqual([{ sourceUrl: 'https://example.com/openapi.json' }]);
  });

  it('drops malformed entries and keeps the usable ones', () => {
    expect(normalizeOpenApiSyncConfigs([
      null,
      undefined,
      'https://example.com/openapi.json',
      42,
      { sourceUrl: 'https://example.com/openapi.json', groupBy: 'tags' }
    ])).toEqual([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'tags'
      }
    ]);
  });

  it('drops entries without a usable sourceUrl', () => {
    expect(normalizeOpenApiSyncConfigs([
      {},
      [],
      { sourceUrl: '' },
      { sourceUrl: 42 },
      { sourceUrl: null },
      { groupBy: 'tags', autoCheck: true }
    ])).toEqual([]);
  });

  it('does not let a malformed entry shadow the valid one behind it', () => {
    expect(normalizeOpenApiSyncConfigs([
      {},
      { sourceUrl: 'https://example.com/openapi.json', groupBy: 'path' }
    ])).toEqual([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'path'
      }
    ]);
  });

  it('keeps a supported authPlacement next to groupBy', () => {
    ['request', 'collection'].forEach((authPlacement) => {
      const [config] = normalizeOpenApiSyncConfigs([
        { sourceUrl: 'https://example.com/openapi.json', groupBy: 'tags', authPlacement }
      ]);

      expect(config).toEqual({
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'tags',
        authPlacement
      });
      expect(Object.keys(config).slice(0, 3)).toEqual(['sourceUrl', 'groupBy', 'authPlacement']);
    });
  });

  it('leaves authPlacement out when it is missing or unsupported', () => {
    [undefined, null, '', 'Collection', 'requests', true, 1].forEach((authPlacement) => {
      const [config] = normalizeOpenApiSyncConfigs([
        { sourceUrl: 'https://example.com/openapi.json', authPlacement }
      ]);

      expect('authPlacement' in config).toBe(false);
    });
  });

  it('keeps a supported requestNameSource after authPlacement', () => {
    ['summary', 'operationId', 'description', 'path'].forEach((requestNameSource) => {
      const [config] = normalizeOpenApiSyncConfigs([
        { sourceUrl: 'https://example.com/openapi.json', groupBy: 'tags', authPlacement: 'collection', requestNameSource }
      ]);

      expect(config).toEqual({
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'tags',
        authPlacement: 'collection',
        requestNameSource
      });
      expect(Object.keys(config).slice(0, 4)).toEqual(['sourceUrl', 'groupBy', 'authPlacement', 'requestNameSource']);
    });
  });

  it('leaves requestNameSource out when it is missing or unsupported', () => {
    [undefined, null, '', 'Summary', 'operationid', 'title', 1].forEach((requestNameSource) => {
      const [config] = normalizeOpenApiSyncConfigs([
        { sourceUrl: 'https://example.com/openapi.json', requestNameSource }
      ]);

      expect('requestNameSource' in config).toBe(false);
    });
  });

  it('keeps the entry but drops an unsupported groupBy', () => {
    const [config] = normalizeOpenApiSyncConfigs([
      { sourceUrl: 'https://example.com/openapi.json', groupBy: 'tag' }
    ]);

    expect(config).toEqual({
      sourceUrl: 'https://example.com/openapi.json'
    });
    expect('groupBy' in config).toBe(false);
  });

  it('returns an empty list for anything that is not an array of entries', () => {
    expect(normalizeOpenApiSyncConfigs(undefined)).toEqual([]);
    expect(normalizeOpenApiSyncConfigs(null)).toEqual([]);
    expect(normalizeOpenApiSyncConfigs([])).toEqual([]);
    expect(normalizeOpenApiSyncConfigs([null, undefined])).toEqual([]);
    expect(normalizeOpenApiSyncConfigs({ sourceUrl: 'https://example.com/openapi.json' })).toEqual([]);
  });
});
