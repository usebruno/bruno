const { describe, it, expect } = require('@jest/globals');
import { mergeHeaders, transformRequestToSaveToFilesystem, getCollectionItemCounts, getAvailableAddToScopes } from './index';
import { VARIABLE_ADD_SCOPES } from 'utils/common/constants';

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

describe('getAvailableAddToScopes', () => {
  const requestItem = { type: 'http-request', request: {} };
  const folderItem = { type: 'folder', items: [] };

  it('returns scopes in a fixed order: Global, Collection Environment, Collection, Request, Folder', () => {
    const scopes = getAvailableAddToScopes('env-1', 'genv-1', requestItem);

    expect(scopes.map((s) => s.type)).toEqual([
      VARIABLE_ADD_SCOPES.GLOBAL,
      VARIABLE_ADD_SCOPES.ENVIRONMENT,
      VARIABLE_ADD_SCOPES.COLLECTION,
      VARIABLE_ADD_SCOPES.REQUEST,
      VARIABLE_ADD_SCOPES.FOLDER
    ]);
  });

  it('omits Request Variable when there is no item', () => {
    const scopes = getAvailableAddToScopes('env-1', 'genv-1', null);

    expect(scopes.map((s) => s.type)).not.toContain(VARIABLE_ADD_SCOPES.REQUEST);
  });

  it('omits Request Variable when the item is a folder, not a request', () => {
    const scopes = getAvailableAddToScopes('env-1', 'genv-1', folderItem);

    expect(scopes.map((s) => s.type)).not.toContain(VARIABLE_ADD_SCOPES.REQUEST);
  });

  it('enables Global Environment only when a global environment is active', () => {
    const withActive = getAvailableAddToScopes('env-1', 'genv-1', requestItem);
    expect(withActive.find((s) => s.type === VARIABLE_ADD_SCOPES.GLOBAL).enabled).toBe(true);

    const withoutActive = getAvailableAddToScopes('env-1', null, requestItem);
    expect(withoutActive.find((s) => s.type === VARIABLE_ADD_SCOPES.GLOBAL).enabled).toBe(false);

    const noArg = getAvailableAddToScopes('env-1', undefined, requestItem);
    expect(noArg.find((s) => s.type === VARIABLE_ADD_SCOPES.GLOBAL).enabled).toBe(false);
  });

  it('enables Collection Environment only when there is an active environment, independent of Global', () => {
    const withActiveEnv = getAvailableAddToScopes('env-1', 'genv-1', requestItem);
    expect(withActiveEnv.find((s) => s.type === VARIABLE_ADD_SCOPES.ENVIRONMENT).enabled).toBe(true);

    const withoutActiveEnv = getAvailableAddToScopes(null, 'genv-1', requestItem);
    expect(withoutActiveEnv.find((s) => s.type === VARIABLE_ADD_SCOPES.ENVIRONMENT).enabled).toBe(false);
  });

  it('always enables Collection Variables', () => {
    const scopes = getAvailableAddToScopes(null, null, null);
    expect(scopes.find((s) => s.type === VARIABLE_ADD_SCOPES.COLLECTION).enabled).toBe(true);
  });

  it('always includes Immediate Parent Folder, disabled with a reason', () => {
    const scopes = getAvailableAddToScopes('env-1', 'genv-1', requestItem);
    const folderScope = scopes.find((s) => s.type === VARIABLE_ADD_SCOPES.FOLDER);

    expect(folderScope.enabled).toBe(false);
    expect(folderScope.disabledReason).toBeTruthy();
  });

  it('flags secret support correctly per scope', () => {
    const scopes = getAvailableAddToScopes('env-1', 'genv-1', requestItem);

    const byType = Object.fromEntries(scopes.map((s) => [s.type, s.supportsSecret]));
    expect(byType[VARIABLE_ADD_SCOPES.GLOBAL]).toBe(true);
    expect(byType[VARIABLE_ADD_SCOPES.ENVIRONMENT]).toBe(true);
    expect(byType[VARIABLE_ADD_SCOPES.COLLECTION]).toBe(false);
    expect(byType[VARIABLE_ADD_SCOPES.REQUEST]).toBe(false);
    expect(byType[VARIABLE_ADD_SCOPES.FOLDER]).toBe(false);
  });
});
