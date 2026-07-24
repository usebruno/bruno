jest.mock('utils/common', () => {
  let counter = 0;

  return {
    uuid: () => {
      counter += 1;
      return `mock-uid-${counter}`;
    }
  };
});

import { cloneMockResponseRecord, resolveMockResponseCollection, resolveMockResponseEditorCollection } from './mock-responses';

describe('mock-responses', () => {
  it('clones mock responses with new uids and a copy name', () => {
    const source = {
      uid: 'response-1',
      name: 'List products',
      request: {
        url: '/products',
        method: 'GET',
        headers: [{ uid: 'header-1', name: 'Accept', value: 'application/json' }],
        params: [{ uid: 'param-1', name: 'category', value: 'books' }]
      },
      response: {
        status: 200,
        headers: [{ uid: 'header-2', name: 'Content-Type', value: 'application/json' }],
        body: { type: 'json', content: '[]' }
      },
      rules: {
        operator: 'AND',
        conditions: [{ uid: 'rule-1', type: 'header', key: 'Authorization', operator: 'equals', value: 'token' }]
      }
    };

    const cloned = cloneMockResponseRecord(source);

    expect(cloned.uid).not.toBe(source.uid);
    expect(cloned.name).toBe('List products copy');
    expect(cloned.request.headers[0].uid).not.toBe('header-1');
    expect(cloned.request.params[0].uid).not.toBe('param-1');
    expect(cloned.response.headers[0].uid).not.toBe('header-2');
    expect(cloned.rules.conditions[0].uid).not.toBe('rule-1');
  });

  it('uses a custom clone name when provided', () => {
    const cloned = cloneMockResponseRecord({ uid: 'response-1', name: 'Users' }, { name: 'Users duplicate' });
    expect(cloned.name).toBe('Users duplicate');
  });
});

describe('resolveMockResponseCollection', () => {
  const collections = [
    { uid: 'collection-1', name: 'Shop' },
    { uid: 'scratch-1', name: 'Scratch', environments: [{ uid: 'env-1', variables: [] }] }
  ];

  it('prefers the provided collection', () => {
    const collection = { uid: 'collection-1', name: 'Shop' };
    expect(resolveMockResponseCollection({
      collection,
      instance: { collectionUid: 'other' },
      collections
    })).toBe(collection);
  });

  it('falls back to the mock server collection uid', () => {
    expect(resolveMockResponseCollection({
      collection: null,
      instance: { collectionUid: 'collection-1' },
      collections
    })).toEqual(collections[0]);
  });

  it('falls back to the workspace scratch collection for spec mock servers', () => {
    expect(resolveMockResponseCollection({
      collection: null,
      instance: { sourceType: 'spec' },
      collections,
      activeWorkspace: { scratchCollectionUid: 'scratch-1' }
    })).toEqual(collections[1]);
  });
});

describe('resolveMockResponseEditorCollection', () => {
  it('merges global and collection environment context for variable resolution', () => {
    const enriched = resolveMockResponseEditorCollection({
      collection: {
        uid: 'collection-1',
        name: 'Shop',
        activeEnvironmentUid: 'env-1',
        environments: [{
          uid: 'env-1',
          variables: [{ uid: 'var-1', name: 'baseUrl', value: 'https://api.example.com', enabled: true }]
        }]
      },
      globalEnvironments: [{
        uid: 'global-env-1',
        variables: [{ uid: 'global-var-1', name: 'token', value: 'abc', enabled: true }]
      }],
      activeGlobalEnvironmentUid: 'global-env-1',
      activeWorkspace: {
        processEnvVariables: { NODE_ENV: 'test' }
      }
    });

    expect(enriched.globalEnvironmentVariables).toEqual({ token: 'abc' });
    expect(enriched.workspaceProcessEnvVariables).toEqual({ NODE_ENV: 'test' });
    expect(enriched.environments[0].variables[0].value).toBe('https://api.example.com');
  });
});
