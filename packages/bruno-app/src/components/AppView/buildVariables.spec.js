import { buildVariables } from './buildVariables';

describe('buildVariables', () => {
  const requestItem = {
    uid: 'r1',
    type: 'http-request',
    name: 'Request',
    request: {
      method: 'GET',
      url: '',
      params: [],
      vars: { req: [{ name: 'requestVar', value: 'request-value', enabled: true }] }
    },
    items: []
  };

  const folder = {
    uid: 'f1',
    type: 'folder',
    name: 'Folder',
    root: { request: { vars: { req: [{ name: 'folderVar', value: 'folder-value', enabled: true }] } } },
    items: [requestItem]
  };

  const collection = {
    uid: 'c1',
    activeEnvironmentUid: 'e1',
    environments: [
      { uid: 'e1', name: 'Env', variables: [{ name: 'envVar', value: 'environment-value', enabled: true }] }
    ],
    runtimeVariables: { runtimeVar: 'runtime-value' },
    globalEnvironmentVariables: { globalVar: 'global-value' },
    oauth2Credentials: [{ credentialsId: 'auth', credentials: { access_token: 'secret-token' } }],
    root: { request: { vars: { req: [{ name: 'collectionVar', value: 'collection-value', enabled: true }] } } },
    items: [folder]
  };

  it('resolves collection, folder and request defined variables for request level app', () => {
    const result = buildVariables(collection, requestItem);
    expect(result.collectionVar).toBe('collection-value');
    expect(result.folderVar).toBe('folder-value');
    expect(result.requestVar).toBe('request-value');
    expect(result.envVar).toBe('environment-value');
    expect(result.globalVar).toBe('global-value');
    expect(result.runtimeVar).toBe('runtime-value');
  });

  it('strips the structural meta keys getAllVariables adds', () => {
    const result = buildVariables(collection, requestItem);
    expect(result).not.toHaveProperty('pathParams');
    expect(result).not.toHaveProperty('maskedEnvVariables');
    expect(result).not.toHaveProperty('process');
  });

  it('does not surface OAuth2 credential secrets into the guest', () => {
    const result = buildVariables(collection, requestItem);
    expect(result).not.toHaveProperty('$oauth2.auth.access_token');
    expect(Object.keys(result).some((key) => key.startsWith('$oauth2.'))).toBe(false);
  });

  it('resolves only collection defined variables when no item is passed (collection level app)', () => {
    const result = buildVariables(collection);
    expect(result.collectionVar).toBe('collection-value');
    expect(result.envVar).toBe('environment-value');
    expect(result.globalVar).toBe('global-value');
    expect(result.runtimeVar).toBe('runtime-value');

    // No folder or request defined variables
    expect(result).not.toHaveProperty('folderVar');
    expect(result).not.toHaveProperty('requestVar');
  });

  it('returns an empty object for a missing collection', () => {
    expect(buildVariables(undefined, requestItem)).toEqual({});
  });
});
