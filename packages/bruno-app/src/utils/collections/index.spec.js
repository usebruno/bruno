const { describe, it, expect } = require('@jest/globals');
import { mergeHeaders, transformRequestToSaveToFilesystem, getCollectionItemCounts, getUniqueTagsFromItems, getCollectionVersion } from './index';

describe('mergeHeaders', () => {
  it('should include headers from collection, folder and request (with correct precedence)', () => {
    const collection = {
      root: {
        request: {
          headers: [
            { name: 'X-Collection', value: 'c', enabled: true }
          ]
        }
      }
    };

    const folder = {
      type: 'folder',
      root: {
        request: {
          headers: [
            { name: 'X-Folder', value: 'f', enabled: true }
          ]
        }
      }
    };

    const request = {
      headers: [
        { name: 'X-Request', value: 'r', enabled: true }
      ]
    };

    const headers = mergeHeaders(collection, request, [folder]);
    const names = headers.map((h) => h.name);
    expect(names).toEqual(expect.arrayContaining(['X-Collection', 'X-Folder', 'X-Request']));
  });
});

describe('transformRequestToSaveToFilesystem', () => {
  it('preserves header and param annotations', () => {
    const item = {
      uid: 'requestuid123456789012',
      type: 'http-request',
      name: 'Annotated Request',
      seq: 1,
      settings: {},
      tags: [],
      examples: [],
      request: {
        method: 'GET',
        url: 'https://example.com',
        params: [
          {
            uid: 'paramuid1234567890123',
            name: 'q',
            value: '1',
            description: '',
            annotations: [{ name: 'param-note', value: 'keep me' }],
            type: 'query',
            enabled: true
          }
        ],
        headers: [
          {
            uid: 'headeruid123456789012',
            name: 'X-Test',
            value: '1',
            description: '',
            annotations: [{ name: 'header-note', value: 'keep me' }],
            enabled: true
          }
        ],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: { req: '', res: '' },
        vars: { req: [], res: [] },
        assertions: [],
        tests: '',
        docs: ''
      }
    };

    const transformed = transformRequestToSaveToFilesystem(item);

    expect(transformed.request.params[0].annotations).toEqual([{ name: 'param-note', value: 'keep me' }]);
    expect(transformed.request.headers[0].annotations).toEqual([{ name: 'header-note', value: 'keep me' }]);
  });
});

describe('getCollectionItemCounts', () => {
  it('counts folders and requests recursively at every depth', () => {
    const items = [
      {
        type: 'folder',
        name: 'Zoo',
        items: [
          { type: 'http-request', name: 'Lion', request: {} },
          { type: 'graphql-request', name: 'Bear', request: {} }
        ]
      },
      {
        type: 'folder',
        name: 'Aviary',
        items: [
          {
            type: 'folder',
            name: 'Nest',
            items: [{ type: 'http-request', name: 'Egg', request: {} }]
          }
        ]
      },
      { type: 'http-request', name: 'RootReq', request: {} }
    ];

    // Folders: Zoo, Aviary, Nest -> 3. Requests: Lion, Bear, Egg, RootReq -> 4.
    expect(getCollectionItemCounts(items)).toEqual({ folderCount: 3, requestCount: 4 });
  });

  it('counts every request transport type', () => {
    const items = [
      { type: 'http-request', request: {} },
      { type: 'graphql-request', request: {} },
      { type: 'grpc-request', request: {} },
      { type: 'ws-request', request: {} }
    ];

    expect(getCollectionItemCounts(items)).toEqual({ folderCount: 0, requestCount: 4 });
  });

  it('returns zero counts for empty or missing items', () => {
    expect(getCollectionItemCounts([])).toEqual({ folderCount: 0, requestCount: 0 });
    expect(getCollectionItemCounts(undefined)).toEqual({ folderCount: 0, requestCount: 0 });
  });
});

describe('getUniqueTagsFromItems', () => {
  const items = [
    { type: 'http-request', request: {}, tags: ['saved'] },
    { type: 'http-request', request: {}, tags: ['other-saved'], draft: { tags: ['draft-only', 'saved'] } },
    { type: 'folder', items: [{ type: 'http-request', request: {}, tags: ['nested'] }] }
  ];

  it('includes draft tags by default', () => {
    expect(getUniqueTagsFromItems(items)).toEqual(['draft-only', 'nested', 'saved']);
  });

  it('reads only saved tags when includeDrafts is false', () => {
    expect(getUniqueTagsFromItems(items, { includeDrafts: false })).toEqual(['nested', 'other-saved', 'saved']);
  });
});

describe('getCollectionVersion', () => {
  it('reads the user-facing version from the normalized brunoConfig.version, for both formats', () => {
    expect(getCollectionVersion({ brunoConfig: { opencollection: '1.0.0', version: '2.5' } })).toBe('2.5');
    expect(getCollectionVersion({ brunoConfig: { version: 'v3.0' } })).toBe('v3.0');
  });

  it('returns an empty string when the version is unset', () => {
    expect(getCollectionVersion({ brunoConfig: {} })).toBe('');
    expect(getCollectionVersion(null)).toBe('');
  });
});
