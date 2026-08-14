const { describe, it, expect } = require('@jest/globals');
import {
  mergeHeaders,
  transformRequestToSaveToFilesystem,
  getCollectionItemCounts,
  getVariableScope,
  isVariableSecret,
  getAvailableAddToScopes,
  getGlobalEnvironmentVariablesMasked,
  getEnvironmentVariablesMasked,
  resolveEnabledVariable,
  getEnvironmentVariables
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

describe('getVariableScope — global environment secrets', () => {
  it('flags a global-scoped variable as secret when its name is in globalEnvSecrets', () => {
    const collection = {
      globalEnvironmentVariables: { apiToken: 'super-secret' },
      globalEnvSecrets: ['apiToken']
    };

    const scopeInfo = getVariableScope('apiToken', collection, null);

    expect(scopeInfo).toEqual({
      type: 'global',
      value: 'super-secret',
      data: { variableName: 'apiToken', value: 'super-secret', variable: { name: 'apiToken', secret: true } }
    });
    expect(isVariableSecret(scopeInfo)).toBe(true);
  });

  it('does not flag a global-scoped variable as secret when its name is not in globalEnvSecrets', () => {
    const collection = {
      globalEnvironmentVariables: { baseUrl: 'https://api.example.com' },
      globalEnvSecrets: ['apiToken']
    };

    const scopeInfo = getVariableScope('baseUrl', collection, null);

    expect(scopeInfo.data.variable).toEqual({ name: 'baseUrl', secret: false });
    expect(isVariableSecret(scopeInfo)).toBe(false);
  });
});

describe('getAvailableAddToScopes — Environment scope labels name the target environment', () => {
  it('names the active environment in the Collection Environment label, so the user can see which file a new variable would land in', () => {
    const scopes = getAvailableAddToScopes({
      activeEnvironmentUid: 'env-1',
      activeEnvironmentName: 'Staging',
      hasCollection: true
    });

    const environmentScope = scopes.find((s) => s.type === 'environment');
    expect(environmentScope.label).toBe('Collection Environment (Staging)');
  });

  it('falls back to the plain "Collection Environment" label when no active environment name is known', () => {
    const scopes = getAvailableAddToScopes({ hasCollection: true });

    const environmentScope = scopes.find((s) => s.type === 'environment');
    expect(environmentScope.label).toBe('Collection Environment');
  });

  it('names the active global environment in the Global Environment label', () => {
    const scopes = getAvailableAddToScopes({
      activeGlobalEnvironmentUid: 'genv-1',
      activeGlobalEnvironmentName: 'Personal'
    });

    const globalScope = scopes.find((s) => s.type === 'global');
    expect(globalScope.label).toBe('Global Environment (Personal)');
  });

  it('falls back to the plain "Global Environment" label when no active global environment name is known', () => {
    const scopes = getAvailableAddToScopes({});

    const globalScope = scopes.find((s) => s.type === 'global');
    expect(globalScope.label).toBe('Global Environment');
  });
});

describe('getAvailableAddToScopes — Folder scope label', () => {
  it('labels the Folder scope "Parent Folder (name)" for a normal ancestor folder', () => {
    const scopes = getAvailableAddToScopes({
      item: { uid: 'req-1', type: 'http-request' },
      parentFolder: { uid: 'folder-1', name: 'Auth' },
      hasCollection: true
    });

    const folderScope = scopes.find((s) => s.type === 'folder');
    expect(folderScope.label).toBe('Parent Folder (Auth)');
  });

  it('labels the Folder scope plainly "Folder" when it is the folder currently being edited', () => {
    const scopes = getAvailableAddToScopes({
      item: { uid: 'folder-1', type: 'folder', name: 'Auth' },
      parentFolder: { uid: 'folder-1', type: 'folder', name: 'Auth' },
      isSelfFolder: true,
      hasCollection: true
    });

    const folderScope = scopes.find((s) => s.type === 'folder');
    expect(folderScope.label).toBe('Folder');
  });
});

describe('getGlobalEnvironmentVariablesMasked', () => {
  const buildState = (variables) => ({
    globalEnvironments: [{ uid: 'genv-1', variables }],
    activeGlobalEnvironmentUid: 'genv-1'
  });

  it('includes a secret variable with a normal non-empty value', () => {
    const names = getGlobalEnvironmentVariablesMasked(
      buildState([{ name: 'apiKey', value: 'abc123', enabled: true, secret: true }])
    );

    expect(names).toEqual(['apiKey']);
  });

  it('still masks secret variables holding a falsy-but-real value (0, false, empty string)', () => {
    const names = getGlobalEnvironmentVariablesMasked(
      buildState([
        { name: 'retryCount', value: 0, enabled: true, secret: true, dataType: 'number' },
        { name: 'featureFlag', value: false, enabled: true, secret: true, dataType: 'boolean' },
        { name: 'blankSecret', value: '', enabled: true, secret: true }
      ])
    );

    expect(names.sort()).toEqual(['blankSecret', 'featureFlag', 'retryCount']);
  });

  it('still masks a secret variable that has no value at all yet', () => {
    const names = getGlobalEnvironmentVariablesMasked(
      buildState([{ name: 'pendingSecret', enabled: true, secret: true }])
    );

    expect(names).toEqual(['pendingSecret']);
  });

  it('excludes a disabled secret and a non-secret variable', () => {
    const names = getGlobalEnvironmentVariablesMasked(
      buildState([
        { name: 'disabledSecret', value: 'x', enabled: false, secret: true },
        { name: 'plainVar', value: 'x', enabled: true, secret: false }
      ])
    );

    expect(names).toEqual([]);
  });

  it('returns an empty array when there is no active global environment', () => {
    expect(getGlobalEnvironmentVariablesMasked({ globalEnvironments: [], activeGlobalEnvironmentUid: null })).toEqual([]);
  });
});

describe('getEnvironmentVariablesMasked', () => {
  const buildCollection = (variables) => ({
    activeEnvironmentUid: 'env-1',
    environments: [{ uid: 'env-1', variables }]
  });

  it('still masks secret variables holding a falsy-but-real value (0, false, empty string)', () => {
    const names = getEnvironmentVariablesMasked(
      buildCollection([
        { name: 'retryCount', value: 0, enabled: true, secret: true, dataType: 'number' },
        { name: 'featureFlag', value: false, enabled: true, secret: true, dataType: 'boolean' },
        { name: 'blankSecret', value: '', enabled: true, secret: true }
      ])
    );

    expect(names.sort()).toEqual(['blankSecret', 'featureFlag', 'retryCount']);
  });

  it('returns an empty array when there is no active environment', () => {
    expect(getEnvironmentVariablesMasked({ activeEnvironmentUid: null, environments: [] })).toEqual([]);
  });
});

describe('resolveEnabledVariable — precedence matches getEnvironmentVariables interpolation', () => {
  it('resolves the last duplicate among enabled plain variables, matching interpolation', () => {
    const variables = [
      { uid: 'u1', name: 'host', value: 'first', enabled: true },
      { uid: 'u2', name: 'host', value: 'second', enabled: true }
    ];

    expect(resolveEnabledVariable(variables, 'host')).toBe(variables[1]);
    expect(getEnvironmentVariables({ activeEnvironmentUid: 'env-1', environments: [{ uid: 'env-1', variables }] })).toEqual({ host: 'second' });
  });

  it('resolves the last duplicate among enabled secrets, matching interpolation', () => {
    const variables = [
      { uid: 'u1', name: 'token', value: 'first-secret', enabled: true, secret: true },
      { uid: 'u2', name: 'token', value: 'second-secret', enabled: true, secret: true }
    ];

    expect(resolveEnabledVariable(variables, 'token')).toBe(variables[1]);
    expect(getEnvironmentVariables({ activeEnvironmentUid: 'env-1', environments: [{ uid: 'env-1', variables }] })).toEqual({ token: 'second-secret' });
  });

  it('prefers a secret over a plain variable regardless of array order, and still picks the last secret among duplicates', () => {
    const variables = [
      { uid: 'u1', name: 'x', value: 'plain-first', enabled: true },
      { uid: 'u2', name: 'x', value: 'secret-first', enabled: true, secret: true },
      { uid: 'u3', name: 'x', value: 'plain-second', enabled: true },
      { uid: 'u4', name: 'x', value: 'secret-second', enabled: true, secret: true }
    ];

    expect(resolveEnabledVariable(variables, 'x')).toBe(variables[3]);
    expect(getEnvironmentVariables({ activeEnvironmentUid: 'env-1', environments: [{ uid: 'env-1', variables }] })).toEqual({ x: 'secret-second' });
  });

  it('ignores disabled duplicates and falls back to undefined when nothing is enabled', () => {
    const variables = [{ uid: 'u1', name: 'x', value: 'off', enabled: false }];

    expect(resolveEnabledVariable(variables, 'x')).toBeUndefined();
  });
});
