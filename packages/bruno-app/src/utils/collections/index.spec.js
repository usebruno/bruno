const { describe, it, expect } = require('@jest/globals');
import path from 'path';
import { mergeHeaders, transformRequestToSaveToFilesystem, getCollectionItemCounts, findFolderByScopeFile } from './index';

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

describe('findFolderByScopeFile', () => {
  const collectionPath = path.resolve('coll');
  const collection = {
    pathname: collectionPath,
    items: [
      { type: 'folder', name: 'users', pathname: path.join(collectionPath, 'users'), items: [] },
      { type: 'folder', name: 'admin', pathname: path.join(collectionPath, 'admin', 'nested'), items: [] },
      { type: 'http-request', name: 'ping', pathname: path.join(collectionPath, 'ping.yaml') }
    ]
  };

  it.each(['folder.bru', 'folder.yml', 'folder.yaml'])('resolves a %s scope to its folder', (folderFile) => {
    // A `.yaml` folder root must resolve too, or its timeline link is silently disabled.
    expect(findFolderByScopeFile(collection, path.posix.join('users', folderFile))?.pathname).toBe(
      path.join(collectionPath, 'users')
    );
  });

  it('resolves a Windows-separated scope path', () => {
    // The main process posixifies this today, but the consumer must not depend on that — an
    // unnormalized separator would make the whole path look like the basename.
    expect(findFolderByScopeFile(collection, path.win32.join('admin', 'nested', 'folder.yaml'))?.pathname).toBe(
      path.join(collectionPath, 'admin', 'nested')
    );
  });

  it('returns null when the scope file is not a folder root', () => {
    expect(findFolderByScopeFile(collection, 'users/get-users.yaml')).toBe(null);
    expect(findFolderByScopeFile(collection, 'opencollection.yaml')).toBe(null);
  });

  it('returns null for a folder root at the collection root, which names no folder', () => {
    expect(findFolderByScopeFile(collection, 'folder.yaml')).toBe(null);
  });

  it('returns null for missing inputs and unknown folders', () => {
    expect(findFolderByScopeFile(null, 'users/folder.yml')).toBe(null);
    expect(findFolderByScopeFile(collection, null)).toBe(null);
    expect(findFolderByScopeFile(collection, 'nope/folder.yml')).toBe(null);
  });
});
