import {
  classifySensitiveValue,
  ENVIRONMENT_SENSITIVE_WARNING,
  extractSensitiveVarNames,
  findUsedEnvironmentVariableUids,
  findUsedGlobalEnvironmentVariableUids,
  findUsedVarsRowUids,
  PLAINTEXT_SENSITIVE_WARNING,
  resolveSensitiveVariable,
  scopedSensitiveWarning
} from './sensitive-fields';

const secret = (name, value = '') => ({ name, value, enabled: true, secret: true });
const plain = (name, value) => ({ name, value, enabled: true, secret: false });

const environment = (uid, name, variables, extra = {}) => ({ uid, name, variables, ...extra });

const buildCollection = ({
  request,
  folders = [],
  collectionVars = [],
  environments = [],
  activeEnvironmentUid = null,
  realActiveEnvironmentUid,
  globalEnvironments = [],
  activeGlobalEnvironmentUid = null
} = {}) => {
  const items = request ? [...folders, request] : folders;
  const collection = {
    items,
    root: { request: { vars: { req: collectionVars, res: [] } } },
    environments,
    activeEnvironmentUid,
    globalEnvironments,
    activeGlobalEnvironmentUid
  };
  if (realActiveEnvironmentUid !== undefined) {
    collection.realActiveEnvironmentUid = realActiveEnvironmentUid;
  }
  return collection;
};

const requestWithVars = (requestVars = [], responseVars = []) => ({
  uid: 'request-1',
  type: 'http-request',
  request: { vars: { req: requestVars, res: responseVars } }
});

const folderWithVars = (uid, requestVars, items = []) => ({
  uid,
  type: 'folder',
  root: { request: { vars: { req: requestVars, res: [] } } },
  items
});

describe('extractSensitiveVarNames', () => {
  it('returns each referenced name in source order', () => {
    expect(extractSensitiveVarNames('Bearer {{ token }}-{{suffix}}')).toEqual([' token ', 'suffix']);
  });

  it('returns nothing for a plain value or an empty interpolation', () => {
    expect(extractSensitiveVarNames('abc123')).toEqual([]);
    expect(extractSensitiveVarNames('{{}}')).toEqual([]);
    expect(extractSensitiveVarNames('')).toEqual([]);
  });
});

describe('classifySensitiveValue', () => {
  const activeSecretEnvironment = environment('env-prod', 'Prod', [secret('token', 'ENV_SECRET')]);

  it('warns when the field contains a plain value', () => {
    expect(classifySensitiveValue('abc123')).toEqual({
      showWarning: true,
      warningMessage: PLAINTEXT_SENSITIVE_WARNING,
      scope: 'plaintext',
      variableName: null
    });
    expect(classifySensitiveValue('Bearer abc123').scope).toBe('plaintext');
  });

  it('does not warn for an empty value', () => {
    expect(classifySensitiveValue('')).toEqual({
      showWarning: false,
      warningMessage: null,
      scope: null,
      variableName: null
    });
    expect(classifySensitiveValue(null).showWarning).toBe(false);
  });

  it('warns when plaintext surrounds a secret environment variable', () => {
    const request = requestWithVars();
    const collection = buildCollection({
      request,
      environments: [activeSecretEnvironment],
      activeEnvironmentUid: 'env-prod'
    });

    expect(classifySensitiveValue('Bearer {{token}}', { collection, item: request })).toEqual({
      showWarning: true,
      warningMessage: PLAINTEXT_SENSITIVE_WARNING,
      scope: 'plaintext',
      variableName: null
    });
    expect(classifySensitiveValue('{{token}}', { collection, item: request })).toMatchObject({
      showWarning: false
    });
  });

  it('warns when Bearer {{token}} resolves to a non-secret environment variable', () => {
    const request = requestWithVars();
    const collection = buildCollection({
      request,
      environments: [environment('env-prod', 'Prod', [plain('token', 'ENV_PLAIN')])],
      activeEnvironmentUid: 'env-prod'
    });

    expect(classifySensitiveValue('Bearer {{token}}', { collection, item: request })).toEqual({
      showWarning: true,
      warningMessage: ENVIRONMENT_SENSITIVE_WARNING,
      scope: 'environment',
      variableName: 'token'
    });
  });

  it('warns when a request variable overrides a secret environment variable', () => {
    const request = requestWithVars([plain('token', 'REQUEST_PLAINTEXT')]);
    const collection = buildCollection({
      request,
      environments: [activeSecretEnvironment],
      activeEnvironmentUid: 'env-prod'
    });

    expect(classifySensitiveValue('{{token}}', { collection, item: request })).toEqual({
      showWarning: true,
      warningMessage: scopedSensitiveWarning('token', 'request'),
      scope: 'request',
      variableName: 'token'
    });
  });

  it('warns when a folder variable overrides a secret environment variable', () => {
    const request = requestWithVars();
    const folder = folderWithVars('folder-1', [plain('token', 'FOLDER_PLAINTEXT')], [request]);
    const collection = buildCollection({
      folders: [folder],
      environments: [activeSecretEnvironment],
      activeEnvironmentUid: 'env-prod'
    });

    expect(classifySensitiveValue('{{token}}', { collection, item: request })).toMatchObject({
      showWarning: true,
      scope: 'folder',
      variableName: 'token'
    });
    expect(classifySensitiveValue('{{token}}', { collection, item: folder })).toMatchObject({
      showWarning: true,
      scope: 'folder'
    });
  });

  it('uses the nearest folder variable', () => {
    const request = requestWithVars();
    const child = folderWithVars('folder-child', [plain('token', 'CHILD')], [request]);
    const parent = folderWithVars('folder-parent', [plain('token', 'PARENT')], [child]);
    const collection = buildCollection({
      folders: [parent],
      environments: [activeSecretEnvironment],
      activeEnvironmentUid: 'env-prod'
    });

    expect(resolveSensitiveVariable('token', { collection, item: request }).variable.value).toBe('CHILD');
    expect(resolveSensitiveVariable('token', { collection, item: parent }).variable.value).toBe('PARENT');
  });

  it('uses the last enabled duplicate in request, folder, and collection Vars', () => {
    const request = requestWithVars([plain('requestToken', 'FIRST'), plain('requestToken', 'LAST')]);
    const folder = folderWithVars(
      'folder-1',
      [plain('folderToken', 'FIRST'), plain('folderToken', 'LAST')],
      [request]
    );
    const collection = buildCollection({
      folders: [folder],
      collectionVars: [plain('collectionToken', 'FIRST'), plain('collectionToken', 'LAST')]
    });

    expect(resolveSensitiveVariable('requestToken', { collection, item: request }).variable.value).toBe('LAST');
    expect(resolveSensitiveVariable('folderToken', { collection, item: request }).variable.value).toBe('LAST');
    expect(resolveSensitiveVariable('collectionToken', { collection }).variable.value).toBe('LAST');
  });

  it('does not let a child request variable change a folder-owned field', () => {
    const request = requestWithVars([plain('token', 'REQUEST_PLAINTEXT')]);
    const folder = folderWithVars('folder-1', [], [request]);
    const collection = buildCollection({
      folders: [folder],
      environments: [activeSecretEnvironment],
      activeEnvironmentUid: 'env-prod'
    });

    expect(classifySensitiveValue('{{token}}', { collection, item: folder }).showWarning).toBe(false);
    expect(classifySensitiveValue('{{token}}', { collection, item: request }).scope).toBe('request');
  });

  it('does not warn when a secret collection environment overrides a collection variable', () => {
    const collection = buildCollection({
      collectionVars: [plain('token', 'COLLECTION_PLAINTEXT')],
      environments: [activeSecretEnvironment],
      activeEnvironmentUid: 'env-prod'
    });

    expect(classifySensitiveValue('{{token}}', { collection })).toMatchObject({ showWarning: false });
  });

  it('warns for a collection variable only when the active environment does not define it', () => {
    const collection = buildCollection({
      collectionVars: [plain('token', 'COLLECTION_PLAINTEXT')],
      environments: [environment('env-prod', 'Prod', [plain('host', 'https://example.test')])],
      activeEnvironmentUid: 'env-prod'
    });

    expect(classifySensitiveValue('{{token}}', { collection })).toEqual({
      showWarning: true,
      warningMessage: scopedSensitiveWarning('token', 'collection'),
      scope: 'collection',
      variableName: 'token'
    });
  });

  it('treats an item without a uid as a collection-owned field', () => {
    const request = requestWithVars([plain('token', 'REQUEST_PLAINTEXT')]);
    const collection = buildCollection({
      request,
      environments: [activeSecretEnvironment],
      activeEnvironmentUid: 'env-prod'
    });

    expect(classifySensitiveValue('{{token}}', { collection, item: {} }).showWarning).toBe(false);
  });

  it('does not let a request variable change the collection-owned field', () => {
    const request = requestWithVars([plain('token', 'REQUEST_PLAINTEXT')]);
    const collection = buildCollection({
      request,
      environments: [activeSecretEnvironment],
      activeEnvironmentUid: 'env-prod'
    });

    expect(classifySensitiveValue('{{token}}', { collection, scope: 'collection' }).showWarning).toBe(false);
  });

  it('warns for a non-secret global environment variable when nothing else defines the name', () => {
    const collection = buildCollection({
      globalEnvironments: [environment('global-1', 'Shared', [plain('token', 'GLOBAL_PLAIN')])],
      activeGlobalEnvironmentUid: 'global-1'
    });

    expect(classifySensitiveValue('{{token}}', { collection })).toEqual({
      showWarning: true,
      warningMessage: ENVIRONMENT_SENSITIVE_WARNING,
      scope: 'global',
      variableName: 'token'
    });
  });

  it('does not warn for a secret global environment variable', () => {
    const collection = buildCollection({
      globalEnvironments: [environment('global-1', 'Shared', [secret('token', 'GLOBAL_SECRET')])],
      activeGlobalEnvironmentUid: 'global-1'
    });

    expect(classifySensitiveValue('{{token}}', { collection }).showWarning).toBe(false);
    expect(classifySensitiveValue('Bearer {{token}}', { collection })).toMatchObject({
      showWarning: true,
      scope: 'plaintext'
    });
  });

  it('lets a collection variable override a global environment variable', () => {
    const collection = buildCollection({
      collectionVars: [plain('token', 'COLLECTION_PLAINTEXT')],
      globalEnvironments: [environment('global-1', 'Shared', [secret('token', 'GLOBAL_SECRET')])],
      activeGlobalEnvironmentUid: 'global-1'
    });

    expect(classifySensitiveValue('{{token}}', { collection }).scope).toBe('collection');
  });

  it('lets a secret collection environment override a non-secret global environment variable', () => {
    const collection = buildCollection({
      environments: [activeSecretEnvironment],
      activeEnvironmentUid: 'env-prod',
      globalEnvironments: [environment('global-1', 'Shared', [plain('token', 'GLOBAL_PLAIN')])],
      activeGlobalEnvironmentUid: 'global-1'
    });

    expect(classifySensitiveValue('{{token}}', { collection }).showWarning).toBe(false);
  });

  it('resolves an inherited collection-environment secret over the child plaintext row', () => {
    const collection = buildCollection({
      environments: [
        environment('env-base', 'base', [secret('token', 'BASE_SECRET')]),
        environment('env-dev', 'dev', [plain('token', 'DEV_PLAIN')], { extends: 'base' })
      ],
      activeEnvironmentUid: 'env-dev'
    });

    const resolved = resolveSensitiveVariable('token', { collection });
    expect(resolved.variable.value).toBe('BASE_SECRET');
    expect(resolved.inheritedFrom).toEqual({ uid: 'env-base', name: 'base' });
    expect(classifySensitiveValue('{{token}}', { collection }).showWarning).toBe(false);
  });

  it('resolves an inherited collection-environment secret when the child does not redefine the name', () => {
    const collection = buildCollection({
      environments: [
        environment('env-base', 'base', [secret('token', 'BASE_SECRET')]),
        environment('env-dev', 'dev', [plain('host', 'https://dev.test')], { extends: 'base' })
      ],
      activeEnvironmentUid: 'env-dev'
    });

    expect(classifySensitiveValue('{{token}}', { collection }).showWarning).toBe(false);
  });

  it('warns for an inherited non-secret collection-environment variable', () => {
    const collection = buildCollection({
      environments: [
        environment('env-base', 'base', [plain('token', 'BASE_PLAIN')]),
        environment('env-dev', 'dev', [], { extends: 'base' })
      ],
      activeEnvironmentUid: 'env-dev'
    });

    expect(classifySensitiveValue('{{token}}', { collection })).toMatchObject({
      showWarning: true,
      scope: 'environment',
      variableName: 'token'
    });
  });

  it('resolves inherited global-environment secrets the same way', () => {
    const secretParent = buildCollection({
      globalEnvironments: [
        environment('global-base', 'base', [secret('token', 'BASE_SECRET')]),
        environment('global-dev', 'dev', [plain('token', 'DEV_PLAIN')], { extends: 'base' })
      ],
      activeGlobalEnvironmentUid: 'global-dev'
    });
    const plainParent = buildCollection({
      globalEnvironments: [
        environment('global-base', 'base', [plain('token', 'BASE_PLAIN')]),
        environment('global-dev', 'dev', [], { extends: 'base' })
      ],
      activeGlobalEnvironmentUid: 'global-dev'
    });

    expect(classifySensitiveValue('{{token}}', { collection: secretParent }).showWarning).toBe(false);
    expect(classifySensitiveValue('{{token}}', { collection: plainParent })).toMatchObject({
      showWarning: true,
      scope: 'global'
    });
  });

  it('ignores a disabled request variable and a response variable', () => {
    const request = requestWithVars(
      [{ name: 'token', value: 'DISABLED', enabled: false, secret: false }],
      [plain('token', 'RESPONSE_PLAINTEXT')]
    );
    const collection = buildCollection({
      request,
      environments: [activeSecretEnvironment],
      activeEnvironmentUid: 'env-prod'
    });

    expect(classifySensitiveValue('{{token}}', { collection, item: request }).showWarning).toBe(false);
  });

  it('does not warn for a name that is only a response variable', () => {
    const request = requestWithVars([], [plain('token', 'RESPONSE_PLAINTEXT')]);
    const collection = buildCollection({ request });

    expect(classifySensitiveValue('{{token}}', { collection, item: request }).showWarning).toBe(false);
  });

  it('stays silent when the only reference is not defined in the collection', () => {
    const collection = buildCollection({
      environments: [environment('env-prod', 'Prod', [])],
      activeEnvironmentUid: 'env-prod'
    });

    expect(classifySensitiveValue('{{process.env.TOKEN}}', { collection }).showWarning).toBe(false);
    expect(classifySensitiveValue('Bearer {{process.env.TOKEN}}', { collection })).toMatchObject({
      showWarning: true,
      scope: 'plaintext'
    });
  });
});

describe('environment table usage flags', () => {
  const tokenVariable = (uid, extra = {}) => ({ uid, name: 'token', value: 'plain', enabled: true, secret: false, ...extra });
  const requestWithAuthValue = (authPath, value, requestVars = []) => {
    const request = {
      uid: 'request-1',
      type: 'http-request',
      request: { vars: { req: requestVars, res: [] } }
    };
    const segments = authPath.split('.');
    let cursor = request.request;
    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        cursor[segment] = value;
        return;
      }
      cursor[segment] = cursor[segment] || {};
      cursor = cursor[segment];
    });
    return request;
  };
  const collectionWithEnvVariables = (request, variables, extra = {}) => ({
    items: request ? [request] : [],
    root: { request: {} },
    environments: [{ uid: 'env-1', name: 'Prod', variables }],
    activeEnvironmentUid: 'env-other',
    ...extra
  });

  it('flags the non-secret environment variable that a sensitive field sends', () => {
    const variable = tokenVariable('env-token');
    const collection = collectionWithEnvVariables(requestWithAuthValue('auth.bearer.token', '{{token}}'), [variable]);

    expect([...findUsedEnvironmentVariableUids(collection, { uid: 'env-1', variables: [variable] })]).toEqual(['env-token']);
  });

  it('does not flag a secret environment variable, and flags a non-secret environment variable that wins over a collection variable', () => {
    const secretVariable = tokenVariable('secret-token', { secret: true, value: '' });
    const plainVariable = tokenVariable('plain-token');
    const collection = collectionWithEnvVariables(requestWithAuthValue('auth.bearer.token', '{{token}}'), [secretVariable]);
    collection.root.request.vars = { req: [plain('token', 'COLLECTION_PLAINTEXT')], res: [] };

    expect([...findUsedEnvironmentVariableUids(collection, { uid: 'env-1', variables: [secretVariable] })]).toEqual([]);
    expect([...findUsedEnvironmentVariableUids(collection, { uid: 'env-1', variables: [plainVariable] })]).toEqual(['plain-token']);
  });

  it('does not flag the environment variable when a request or folder variable wins', () => {
    const variable = tokenVariable('env-token');
    const request = requestWithAuthValue('auth.bearer.token', '{{token}}', [plain('token', 'REQUEST_PLAINTEXT')]);
    const folder = folderWithVars('folder-1', [plain('token', 'FOLDER_PLAINTEXT')], [
      requestWithAuthValue('auth.apikey.value', '{{token}}')
    ]);
    folder.items[0].uid = 'request-2';
    const collection = {
      items: [request, folder],
      root: { request: {} },
      environments: [{ uid: 'env-1', name: 'Prod', variables: [variable] }]
    };

    expect([...findUsedEnvironmentVariableUids(collection, { uid: 'env-1', variables: [variable] })]).toEqual([]);
  });

  it('flags the new credential fields and an unsaved request draft', () => {
    const variable = tokenVariable('env-token');
    const savedRequest = {
      uid: 'request-1',
      type: 'http-request',
      request: { auth: {}, vars: { req: [], res: [] } },
      draft: { request: { auth: { awsv4: { sessionToken: '{{token}}' } }, vars: { req: [], res: [] } } }
    };
    const collection = collectionWithEnvVariables(savedRequest, [variable], {
      brunoConfig: {
        clientCertificates: { certs: [{ passphrase: '{{token}}' }] }
      },
      root: {
        request: {
          auth: {
            oauth2: { password: '{{token}}', clientSecret: '{{other}}' },
            oauth1: { consumerSecret: '{{token}}', accessTokenSecret: '{{token}}', privateKey: '{{token}}' },
            apikey: { value: '{{token}}' }
          }
        }
      }
    });

    expect(findUsedEnvironmentVariableUids(collection, { uid: 'env-1', variables: [variable] }).has('env-token')).toBe(true);
  });

  it('flags a variable named in the proxy password', () => {
    const variable = tokenVariable('env-token');
    const collection = collectionWithEnvVariables(null, [variable], {
      brunoConfig: {
        proxy: { inherit: false, config: { auth: { password: '{{token}}' } } }
      }
    });

    expect([...findUsedEnvironmentVariableUids(collection, { uid: 'env-1', variables: [variable] })]).toEqual(['env-token']);
  });

  it('flags the inherited row that wins and not a plaintext child that loses to it', () => {
    const inherited = tokenVariable('base-token');
    const own = tokenVariable('dev-token');
    const collection = {
      items: [requestWithAuthValue('auth.bearer.token', '{{token}}')],
      root: { request: {} },
      environments: [
        { uid: 'base', name: 'base', variables: [inherited] },
        { uid: 'dev', name: 'dev', extends: 'base', variables: [] }
      ]
    };

    expect([...findUsedEnvironmentVariableUids(collection, { uid: 'dev', variables: [] })]).toEqual(['base-token']);
    expect([...findUsedEnvironmentVariableUids(collection, { uid: 'dev', variables: [own] })]).toEqual(['dev-token']);
  });

  it('flags a global variable only when no closer scope sends the value', () => {
    const globalVariable = tokenVariable('global-token');
    const collectionEnvironment = tokenVariable('collection-token', { secret: true, value: '' });
    const request = requestWithAuthValue('auth.bearer.token', '{{token}}');
    const openCollection = collectionWithEnvVariables(request, [collectionEnvironment], { activeEnvironmentUid: 'env-1' });
    const otherCollection = collectionWithEnvVariables(request, []);
    const globalEnvironments = [{ uid: 'global-1', name: 'Shared', variables: [globalVariable] }];

    expect([...findUsedGlobalEnvironmentVariableUids([openCollection], globalEnvironments, globalEnvironments[0])]).toEqual([]);
    expect([...findUsedGlobalEnvironmentVariableUids([otherCollection], globalEnvironments, globalEnvironments[0])]).toEqual(['global-token']);
  });

  it('uses the unsaved environment draft when deciding which row wins', () => {
    const saved = tokenVariable('saved-token', { name: 'oldToken' });
    const drafted = tokenVariable('draft-token');
    const collection = collectionWithEnvVariables(requestWithAuthValue('auth.bearer.token', '{{token}}'), [saved]);

    expect([...findUsedEnvironmentVariableUids(collection, { uid: 'env-1', variables: [drafted] })]).toEqual(['draft-token']);
  });
});

describe('vars table usage flags', () => {
  const requestVar = (uid, name = 'token', extra = {}) => ({ uid, name, value: 'plain', enabled: true, ...extra });

  it('flags the request variable that overrides a secret environment variable', () => {
    const variable = requestVar('request-token');
    const request = {
      uid: 'request-1',
      type: 'http-request',
      request: {
        auth: { bearer: { token: '{{token}}' } },
        vars: { req: [variable], res: [requestVar('response-token')] }
      }
    };
    const collection = buildCollection({
      request,
      environments: [environment('env-prod', 'Prod', [secret('token', 'ENV_SECRET')])],
      activeEnvironmentUid: 'env-prod'
    });

    expect([...findUsedVarsRowUids(collection, 'request')]).toEqual(['request-token']);
  });

  it('flags a request variable that overrides auth inherited from the collection', () => {
    const variable = requestVar('request-token');
    const request = {
      uid: 'request-1',
      type: 'http-request',
      request: { auth: { mode: 'inherit' }, vars: { req: [variable], res: [] } }
    };
    const collection = buildCollection({
      request,
      environments: [environment('env-prod', 'Prod', [secret('token', 'ENV_SECRET')])],
      activeEnvironmentUid: 'env-prod'
    });
    collection.root.request.auth = { mode: 'bearer', bearer: { token: '{{token}}' } };

    expect([...findUsedVarsRowUids(collection, 'request')]).toEqual(['request-token']);
    expect([...findUsedEnvironmentVariableUids(collection, collection.environments[0])]).toEqual([]);
  });

  it('flags the folder variable only when an inheriting request sends it', () => {
    const folderVariable = requestVar('folder-token');
    const requestVariable = requestVar('request-token');
    const inheritingRequest = {
      uid: 'request-1',
      type: 'http-request',
      request: { auth: { mode: 'inherit' }, vars: { req: [], res: [] } }
    };
    const overridingRequest = {
      uid: 'request-2',
      type: 'http-request',
      request: { auth: { mode: 'inherit' }, vars: { req: [requestVariable], res: [] } }
    };
    const quietFolder = folderWithVars('folder-1', [folderVariable], [inheritingRequest]);
    quietFolder.root.request.auth = { mode: 'bearer', bearer: { token: '{{token}}' } };
    const overridingFolder = folderWithVars('folder-2', [folderVariable], [overridingRequest]);
    overridingFolder.root.request.auth = { mode: 'bearer', bearer: { token: '{{token}}' } };

    const inherited = buildCollection({
      folders: [quietFolder],
      environments: [environment('env-prod', 'Prod', [secret('token', 'ENV_SECRET')])],
      activeEnvironmentUid: 'env-prod'
    });
    const overridden = buildCollection({
      folders: [overridingFolder],
      environments: [environment('env-prod', 'Prod', [secret('token', 'ENV_SECRET')])],
      activeEnvironmentUid: 'env-prod'
    });

    expect([...findUsedVarsRowUids(inherited, 'folder')]).toEqual(['folder-token']);
    expect([...findUsedVarsRowUids(overridden, 'folder')]).toEqual([]);
    expect([...findUsedVarsRowUids(overridden, 'request')]).toEqual(['request-token']);
  });

  it('does not flag a disabled request variable', () => {
    const variable = requestVar('request-token', 'token', { enabled: false });
    const request = {
      uid: 'request-1',
      type: 'http-request',
      request: {
        auth: { bearer: { token: '{{token}}' } },
        vars: { req: [variable], res: [] }
      }
    };
    const collection = buildCollection({
      request,
      environments: [environment('env-prod', 'Prod', [secret('token', 'ENV_SECRET')])],
      activeEnvironmentUid: 'env-prod'
    });

    expect([...findUsedVarsRowUids(collection, 'request')]).toEqual([]);
  });

  it('flags the folder variable that wins and not a parent folder variable with the same name', () => {
    const childVariable = requestVar('child-token');
    const parentVariable = requestVar('parent-token');
    const request = {
      uid: 'request-1',
      type: 'http-request',
      request: { auth: { bearer: { token: '{{token}}' } }, vars: { req: [], res: [] } }
    };
    const child = folderWithVars('folder-child', [childVariable], [request]);
    const parent = folderWithVars('folder-parent', [parentVariable], [child]);
    const collection = buildCollection({
      folders: [parent],
      environments: [environment('env-prod', 'Prod', [secret('token', 'ENV_SECRET')])],
      activeEnvironmentUid: 'env-prod'
    });

    expect([...findUsedVarsRowUids(collection, 'folder')]).toEqual(['child-token']);
  });

  it('does not flag a folder variable when the request variable wins', () => {
    const folderVariable = requestVar('folder-token');
    const requestVariable = requestVar('request-token');
    const request = {
      uid: 'request-1',
      type: 'http-request',
      request: {
        auth: { bearer: { token: '{{token}}' } },
        vars: { req: [requestVariable], res: [] }
      }
    };
    const folder = folderWithVars('folder-1', [folderVariable], [request]);
    const collection = buildCollection({
      folders: [folder],
      environments: [environment('env-prod', 'Prod', [secret('token', 'ENV_SECRET')])],
      activeEnvironmentUid: 'env-prod'
    });

    expect([...findUsedVarsRowUids(collection, 'folder')]).toEqual([]);
    expect([...findUsedVarsRowUids(collection, 'request')]).toEqual(['request-token']);
  });

  it('flags a collection variable only when the active environment does not define it', () => {
    const collectionVariable = requestVar('collection-token');
    const request = {
      uid: 'request-1',
      type: 'http-request',
      request: { auth: { bearer: { token: '{{token}}' } }, vars: { req: [], res: [] } }
    };
    const withSecretEnvironment = buildCollection({
      request,
      collectionVars: [collectionVariable],
      environments: [environment('env-prod', 'Prod', [secret('token', 'ENV_SECRET')])],
      activeEnvironmentUid: 'env-prod'
    });
    const withoutEnvironmentVariable = buildCollection({
      request,
      collectionVars: [collectionVariable],
      environments: [environment('env-prod', 'Prod', [])],
      activeEnvironmentUid: 'env-prod'
    });

    expect([...findUsedVarsRowUids(withSecretEnvironment, 'collection')]).toEqual([]);
    expect([...findUsedVarsRowUids(withoutEnvironmentVariable, 'collection')]).toEqual(['collection-token']);
  });
});
