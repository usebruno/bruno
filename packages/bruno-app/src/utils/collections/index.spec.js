const { describe, it, expect } = require('@jest/globals');
import {
  mergeHeaders,
  transformRequestToSaveToFilesystem,
  getCollectionItemCounts,
  getVisibleSidebarUidsInOrder,
  getSelectionInfo
} from './index';

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

const buildFolderA = (overrides = {}) => ({
  uid: 'folderA',
  type: 'folder',
  name: 'folderA',
  pathname: '/colA/folderA',
  collapsed: false,
  items: [
    { uid: 'reqA1', type: 'http-request', request: {}, name: 'Alpha', seq: 1, pathname: '/colA/folderA/Alpha.bru' }
  ],
  ...overrides
});

const buildCollectionA = (overrides = {}) => ({
  uid: 'colA',
  pathname: '/colA',
  collapsed: false,
  items: [
    buildFolderA(overrides.folderA),
    { uid: 'reqRoot', type: 'http-request', request: {}, name: 'Root', seq: 2, pathname: '/colA/Root.bru' }
  ],
  ...overrides.collection
});

const buildCollectionB = () => ({
  uid: 'colB',
  pathname: '/colB',
  collapsed: true,
  items: [
    { uid: 'reqB1', type: 'http-request', request: {}, name: 'Bravo', seq: 1, pathname: '/colB/Bravo.bru' }
  ]
});

describe('getVisibleSidebarUidsInOrder', () => {
  it('lists loaded collections and their expanded items in render order, skipping ghost entries and collapsed subtrees', () => {
    const sidebarEntries = [
      { kind: 'loaded', collection: buildCollectionA() },
      { kind: 'ghost', entry: { name: 'Missing', path: '/ghost' } },
      { kind: 'loaded', collection: buildCollectionB() }
    ];

    expect(getVisibleSidebarUidsInOrder({ sidebarEntries, searchText: '' }))
      .toEqual(['colA', 'folderA', 'reqA1', 'reqRoot', 'colB']);
  });

  it('hides a collapsed folder\'s children even though the collection itself is expanded', () => {
    const sidebarEntries = [
      { kind: 'loaded', collection: buildCollectionA({ folderA: { collapsed: true } }) }
    ];

    expect(getVisibleSidebarUidsInOrder({ sidebarEntries, searchText: '' }))
      .toEqual(['colA', 'folderA', 'reqRoot']);
  });

  it('while searching, only includes matching requests and force-expands folders that contain a match', () => {
    const sidebarEntries = [
      { kind: 'loaded', collection: buildCollectionA({ folderA: { collapsed: true } }) },
      { kind: 'loaded', collection: buildCollectionB() }
    ];

    expect(getVisibleSidebarUidsInOrder({ sidebarEntries, searchText: 'alpha' }))
      .toEqual(['colA', 'folderA', 'reqA1']);
  });
});

describe('getSelectionInfo', () => {
  const collections = [buildCollectionA(), buildCollectionB()];

  it('collapses a collection and anything selected inside it down to just the collection (parent wins)', () => {
    const info = getSelectionInfo({ collections, selectedUids: ['colA', 'folderA', 'reqA1'] });

    expect(info.effectiveSelection.map((e) => e.uid)).toEqual(['colA']);
    expect(info).toMatchObject({ hasCollection: true, hasFolder: false, hasRequest: false });
  });

  it('collapses a folder and its own descendant request down to just the folder', () => {
    const info = getSelectionInfo({ collections, selectedUids: ['folderA', 'reqA1'] });

    expect(info.effectiveSelection.map((e) => e.uid)).toEqual(['folderA']);
    expect(info).toMatchObject({ hasCollection: false, hasFolder: true, hasRequest: false });
  });

  it('keeps a folder and an unrelated sibling request both selected', () => {
    const info = getSelectionInfo({ collections, selectedUids: ['folderA', 'reqRoot'] });

    expect(info.effectiveSelection.map((e) => e.uid).sort()).toEqual(['folderA', 'reqRoot']);
    expect(info).toMatchObject({ hasCollection: false, hasFolder: true, hasRequest: true });
  });

  it('keeps two independently-selected collections both selected', () => {
    const info = getSelectionInfo({ collections, selectedUids: ['colA', 'colB'] });

    expect(info.effectiveSelection.map((e) => e.uid).sort()).toEqual(['colA', 'colB']);
    expect(info).toMatchObject({ hasCollection: true, hasFolder: false, hasRequest: false });
  });
});
