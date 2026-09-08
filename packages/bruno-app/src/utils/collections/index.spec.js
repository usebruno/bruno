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
  getEnvironmentVariables,
  getVisibleSidebarUidsInOrder,
  getSelectionInfo,
  getUniqueTagsFromItems,
  getCollectionVersion
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

describe('getVariableScope — global environment secrets', () => {
  const buildCollection = (variables) => ({
    activeGlobalEnvironmentUid: 'genv-1',
    globalEnvironments: [{ uid: 'genv-1', name: 'Workspace', variables }]
  });

  it('flags a global-scoped variable as secret when its row is marked secret', () => {
    const variable = { uid: 'v1', name: 'apiToken', value: 'super-secret', enabled: true, secret: true };

    const scopeInfo = getVariableScope('apiToken', buildCollection([variable]), null);

    expect(scopeInfo).toEqual({
      type: 'global',
      value: 'super-secret',
      data: { variableName: 'apiToken', value: 'super-secret', variable }
    });
    expect(isVariableSecret(scopeInfo)).toBe(true);
  });

  it('does not flag a global-scoped variable as secret when its row is not marked secret', () => {
    const variable = { uid: 'v1', name: 'baseUrl', value: 'https://api.example.com', enabled: true, secret: false };

    const scopeInfo = getVariableScope('baseUrl', buildCollection([variable]), null);

    expect(scopeInfo.data.variable).toEqual(variable);
    expect(isVariableSecret(scopeInfo)).toBe(false);
  });
});

describe('getVariableScope — global environment inheritance', () => {
  const buildCollection = () => ({
    activeGlobalEnvironmentUid: 'genv-dev',
    globalEnvironments: [
      {
        uid: 'genv-base',
        name: 'workspace_base',
        variables: [{ uid: 'v1', name: 'host', value: 'http://base.example.com', enabled: true, secret: false }]
      },
      {
        uid: 'genv-dev',
        name: 'workspace_dev',
        extends: 'workspace_base',
        variables: [{ uid: 'v2', name: 'token', value: 'dev-token', enabled: true, secret: false }]
      }
    ]
  });

  it('names the ancestor a variable is inherited from', () => {
    const scopeInfo = getVariableScope('host', buildCollection(), null);

    expect(scopeInfo.type).toBe('global');
    expect(scopeInfo.value).toBe('http://base.example.com');
    expect(scopeInfo.inheritedFrom).toEqual({ uid: 'genv-base', name: 'workspace_base' });
  });

  it('leaves a variable the active global environment owns unmarked', () => {
    const scopeInfo = getVariableScope('token', buildCollection(), null);

    expect(scopeInfo.type).toBe('global');
    expect(scopeInfo.inheritedFrom).toBeUndefined();
  });

  it('leaves a variable unmarked when the environment redeclares the name it inherits', () => {
    const collection = buildCollection();
    collection.globalEnvironments[1].variables.push({
      uid: 'v3',
      name: 'host',
      value: 'http://dev.example.com',
      enabled: true,
      secret: false
    });

    const scopeInfo = getVariableScope('host', collection, null);

    expect(scopeInfo.inheritedFrom).toBeUndefined();
  });
});

describe('getVariableScope — secrets win over plain variables across inheritance', () => {
  const buildCollection = ({ inheritedSecret, ownSecret }) => ({
    activeEnvironmentUid: 'env-dev',
    environments: [
      {
        uid: 'env-base',
        name: 'base',
        variables: [{ uid: 'v1', name: 'apiToken', value: 'base-token', enabled: true, secret: inheritedSecret }]
      },
      {
        uid: 'env-dev',
        name: 'dev',
        extends: 'base',
        variables: [{ uid: 'v2', name: 'apiToken', value: 'dev-token', enabled: true, secret: ownSecret }]
      }
    ]
  });

  it('resolves to the inherited secret when the active environment declares the name as a plain variable', () => {
    const scopeInfo = getVariableScope('apiToken', buildCollection({ inheritedSecret: true, ownSecret: false }), null);

    expect(scopeInfo.value).toBe('base-token');
    expect(isVariableSecret(scopeInfo)).toBe(true);
    expect(scopeInfo.inheritedFrom).toEqual({ uid: 'env-base', name: 'base' });
  });

  it('resolves to the active environment\'s secret when the inherited declaration is plain', () => {
    const scopeInfo = getVariableScope('apiToken', buildCollection({ inheritedSecret: false, ownSecret: true }), null);

    expect(scopeInfo.value).toBe('dev-token');
    expect(isVariableSecret(scopeInfo)).toBe(true);
    expect(scopeInfo.inheritedFrom).toBeUndefined();
  });

  it('resolves to the active environment when both declarations are equally secret', () => {
    const scopeInfo = getVariableScope('apiToken', buildCollection({ inheritedSecret: true, ownSecret: true }), null);

    expect(scopeInfo.value).toBe('dev-token');
    expect(scopeInfo.inheritedFrom).toBeUndefined();
  });

  it('resolves a global-scoped name to the inherited secret over the active plain declaration', () => {
    const collection = {
      activeGlobalEnvironmentUid: 'genv-dev',
      globalEnvironments: [
        {
          uid: 'genv-base',
          name: 'workspace_base',
          variables: [{ uid: 'v1', name: 'apiToken', value: 'base-token', enabled: true, secret: true }]
        },
        {
          uid: 'genv-dev',
          name: 'workspace_dev',
          extends: 'workspace_base',
          variables: [{ uid: 'v2', name: 'apiToken', value: 'dev-token', enabled: true, secret: false }]
        }
      ]
    };

    const scopeInfo = getVariableScope('apiToken', collection, null);

    expect(scopeInfo.value).toBe('base-token');
    expect(isVariableSecret(scopeInfo)).toBe(true);
    expect(scopeInfo.inheritedFrom).toEqual({ uid: 'genv-base', name: 'workspace_base' });
  });
});

describe('getVariableScope — realActiveEnvironmentUid overrides activeEnvironmentUid for detection', () => {
  const buildCollection = () => ({
    activeEnvironmentUid: 'env-staging', // the environment currently being viewed
    realActiveEnvironmentUid: 'env-prod', // the collection's actual active environment
    environments: [
      { uid: 'env-staging', name: 'Staging', variables: [] },
      {
        uid: 'env-prod',
        name: 'Prod',
        variables: [{ uid: 'v1', name: 'apiToken', value: 'plain-value', enabled: true, secret: false }]
      }
    ]
  });

  it('resolves an existing variable against the real active environment, not the one being viewed', () => {
    const scopeInfo = getVariableScope('apiToken', buildCollection(), null);

    expect(scopeInfo.type).toBe('environment');
    expect(scopeInfo.data.environment.uid).toBe('env-prod');
    expect(scopeInfo.data.variable).toEqual(expect.objectContaining({ name: 'apiToken', secret: false }));
  });

  it('falls back to activeEnvironmentUid when realActiveEnvironmentUid is absent (every other caller)', () => {
    const collection = {
      activeEnvironmentUid: 'env-prod',
      environments: [
        {
          uid: 'env-prod',
          name: 'Prod',
          variables: [{ uid: 'v1', name: 'apiToken', value: 'plain-value', enabled: true, secret: false }]
        }
      ]
    };

    const scopeInfo = getVariableScope('apiToken', collection, null);

    expect(scopeInfo.type).toBe('environment');
    expect(scopeInfo.data.environment.uid).toBe('env-prod');
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

  it('masks secrets inherited from a parent environment', () => {
    const names = getEnvironmentVariablesMasked({
      activeEnvironmentUid: 'env-child',
      environments: [
        {
          uid: 'env-parent',
          name: 'Base',
          variables: [
            { name: 'PARENT_SECRET', value: 'parent-secret', enabled: true, secret: true },
            { name: 'PARENT_PLAIN', value: 'parent-plain', enabled: true, secret: false }
          ]
        },
        {
          uid: 'env-child',
          name: 'Staging',
          extends: 'Base',
          variables: [{ name: 'CHILD_SECRET', value: 'child-secret', enabled: true, secret: true }]
        }
      ]
    });

    expect(names.sort()).toEqual(['CHILD_SECRET', 'PARENT_SECRET']);
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

describe('getEnvironmentVariables', () => {
  const collection = {
    activeEnvironmentUid: 'env-dev',
    environments: [
      {
        uid: 'env-base',
        name: 'base',
        variables: [
          { name: 'host', value: 'http://localhost:8081', enabled: true, secret: false },
          { name: 'api_url', value: 'https://base.example.com', enabled: true, secret: false },
          { name: 'base_only', value: 'base_only_value', enabled: true, secret: false },
          { name: 'api_key', value: 'plain_api_key', enabled: true, secret: false },
          { name: 'shadowed_by_disabled', value: 'from_base', enabled: true, secret: false },
          { name: 'overridden_plain', value: 'plain_from_base', enabled: true, secret: false },
          { name: 'disabled_in_base', value: 'should_not_resolve', enabled: false, secret: false },
          { name: 'base_token', value: 'token-from-base', enabled: true, secret: true },
          { name: 'overridden_secret', value: 'secret-from-base', enabled: true, secret: true }
        ]
      },
      {
        uid: 'env-dev',
        name: 'dev',
        extends: 'base',
        variables: [
          { name: 'api_url', value: 'https://dev.example.com', enabled: true, secret: false },
          { name: 'dev_only', value: 'dev_only_value', enabled: true, secret: false },
          { name: 'shadowed_by_disabled', value: 'never_applied', enabled: false, secret: false },
          { name: 'overridden_secret', value: 'plain_wins_in_dev', enabled: true, secret: false },
          { name: 'overridden_plain', value: '', enabled: true, secret: true }
        ]
      },
      {
        uid: 'env-staging',
        name: 'staging',
        extends: 'base',
        variables: [{ name: 'api_key', value: 'api-key-from-staging', enabled: true, secret: true }]
      },
      {
        uid: 'env-qa',
        name: 'qa',
        extends: 'staging',
        variables: [{ name: 'api_url', value: 'https://qa.example.com', enabled: true, secret: false }]
      }
    ]
  };

  const variablesFor = (environmentUid) =>
    getEnvironmentVariables({ ...collection, activeEnvironmentUid: environmentUid });

  it('resolves inherited variables alongside the own rows that override them', () => {
    const variables = variablesFor('env-dev');

    expect(variables.host).toBe('http://localhost:8081');
    expect(variables.base_only).toBe('base_only_value');
    expect(variables.dev_only).toBe('dev_only_value');
    expect(variables.api_url).toBe('https://dev.example.com');
  });

  it('ignores a disabled row on either side of the merge', () => {
    const variables = variablesFor('env-dev');

    expect(variables).not.toHaveProperty('disabled_in_base');
    // `dev` declares this name too, but disabled, so the inherited row still applies.
    expect(variables.shadowed_by_disabled).toBe('from_base');
  });

  it('resolves a secret inherited from either ancestor of a three-level chain', () => {
    const variables = variablesFor('env-qa');

    expect(variables.base_token).toBe('token-from-base');
    // `base` declares `api_key` plain and `staging` redeclares it secret, so both are
    // inherited by `qa` — the secret is the one that must reach the request.
    expect(variables.api_key).toBe('api-key-from-staging');
  });

  it('resolves a name declared on both sides of the secret split to the secret', () => {
    const variables = variablesFor('env-dev');

    // `dev` redeclares the secret `overridden_secret` it inherits as a non-secret, and the
    // non-secret `overridden_plain` as a secret. Both ancestor rows survive the redeclaration,
    // and in each pair the secret is the one that wins.
    expect(variables.overridden_secret).toBe('secret-from-base');
    expect(variables.overridden_plain).toBe('');
  });

  it('returns no variables without a collection or an active environment', () => {
    expect(getEnvironmentVariables(null)).toEqual({});
    expect(variablesFor(null)).toEqual({});
  });
});
