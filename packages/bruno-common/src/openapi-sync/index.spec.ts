import { describe, it, expect } from '@jest/globals';
import { normalizeOpenApiSyncConfigs } from './index';

describe('normalizeOpenApiSyncConfigs', () => {
  it('keeps the sync metadata and fills in the auto-check defaults', () => {
    expect(normalizeOpenApiSyncConfigs([
      { sourceUrl: 'https://example.com/openapi.json', groupBy: 'tags' }
    ])).toEqual([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'tags',
        autoCheck: true,
        autoCheckInterval: 5
      }
    ]);
  });

  it('preserves explicitly configured auto-check settings', () => {
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
        groupBy: 'tags',
        autoCheck: true,
        autoCheckInterval: 5
      }
    ]);
  });

  it('returns an empty list for anything that is not an array of entries', () => {
    expect(normalizeOpenApiSyncConfigs(undefined)).toEqual([]);
    expect(normalizeOpenApiSyncConfigs(null)).toEqual([]);
    expect(normalizeOpenApiSyncConfigs([])).toEqual([]);
    expect(normalizeOpenApiSyncConfigs([null, undefined])).toEqual([]);
    expect(normalizeOpenApiSyncConfigs({ sourceUrl: 'https://example.com/openapi.json' })).toEqual([]);
  });
});
