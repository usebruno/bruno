jest.mock('providers/ReduxStore', () => ({ __esModule: true, default: { getState: () => ({}) } }));

import {
  buildAiContextPayload,
  buildAiRequestContext,
  buildAiVariablesPayload,
  buildDocsContextFromCollection,
  buildDocsContextFromFolder,
  buildRequestContextFromItem
} from './index';

describe('utils/ai', () => {
  const collection = {
    name: 'Pet Store API',
    items: [
      {
        uid: 'f1',
        type: 'folder',
        name: 'Users',
        items: [
          {
            uid: 'r1',
            type: 'http-request',
            name: 'List Users',
            request: { method: 'GET', url: '{{base}}/users' }
          },
          {
            uid: 'f2',
            type: 'folder',
            name: 'Admin',
            items: [
              {
                uid: 'r2',
                type: 'http-request',
                name: 'Delete User',
                request: { method: 'DELETE', url: '{{base}}/users/1' }
              }
            ]
          }
        ]
      },
      {
        uid: 'r3',
        type: 'http-request',
        name: 'Health Check',
        request: { method: 'GET', url: '{{base}}/health' }
      }
    ]
  };

  describe('buildDocsContextFromCollection', () => {
    it('summarizes top-level folders and requests', () => {
      expect(buildDocsContextFromCollection(collection)).toEqual({
        scope: 'collection',
        name: 'Pet Store API',
        folders: [
          {
            name: 'Users',
            requestCount: 1,
            subfolderCount: 1
          }
        ],
        requests: [
          {
            name: 'Health Check',
            method: 'GET',
            url: '{{base}}/health',
            type: 'http-request'
          }
        ]
      });
    });

    it('returns null when collection is missing', () => {
      expect(buildDocsContextFromCollection(null)).toBeNull();
    });
  });

  describe('buildDocsContextFromFolder', () => {
    it('summarizes direct child folders and requests for the folder scope', () => {
      const folder = collection.items[0];

      expect(buildDocsContextFromFolder(collection, folder)).toEqual({
        scope: 'folder',
        name: 'Users',
        collectionName: 'Pet Store API',
        folders: [
          {
            name: 'Admin',
            requestCount: 1,
            subfolderCount: 0
          }
        ],
        requests: [
          {
            name: 'List Users',
            method: 'GET',
            url: '{{base}}/users',
            type: 'http-request'
          }
        ]
      });
    });

    it('returns null when folder is missing', () => {
      expect(buildDocsContextFromFolder(collection, null)).toBeNull();
    });
  });

  describe('buildRequestContextFromItem', () => {
    it('builds request details for request-level docs', () => {
      const item = collection.items[1];

      expect(buildRequestContextFromItem(item)).toEqual({
        url: '{{base}}/health',
        method: 'GET',
        headers: [],
        params: [],
        body: null
      });
    });
  });

  describe('buildAiRequestContext', () => {
    it('includes docs and the last response on top of the lean request context', () => {
      const item = {
        request: {
          method: 'POST',
          url: '/widgets',
          headers: [{ name: 'X-Foo', value: 'bar', enabled: true }],
          params: [],
          body: { mode: 'json', json: '{}' },
          docs: 'Some docs'
        },
        response: { status: 201, data: { id: 'abc' } }
      };

      expect(buildAiRequestContext(item)).toEqual({
        url: '/widgets',
        method: 'POST',
        headers: [{ name: 'X-Foo', value: 'bar', enabled: true }],
        params: [],
        body: { mode: 'json', json: '{}' },
        docs: 'Some docs',
        responseStatus: 201,
        responseData: { id: 'abc' }
      });
    });

    it('returns null for an item with no request', () => {
      expect(buildAiRequestContext(null)).toBeNull();
      expect(buildAiRequestContext({})).toBeNull();
    });
  });

  describe('buildAiVariablesPayload', () => {
    const variablesCollection = {
      activeEnvironmentUid: 'env-1',
      environments: [
        {
          uid: 'env-1',
          variables: [
            { name: 'API_URL', value: 'https://x', enabled: true, secret: false },
            { name: 'API_TOKEN', value: 'real-tok', enabled: true, secret: true },
            { name: 'DISABLED', value: 'ignore', enabled: false, secret: false }
          ]
        }
      ],
      globalEnvironmentVariables: { GLOBAL_FOO: 'foo', GLOBAL_SECRET: 's' },
      globalEnvSecrets: ['GLOBAL_SECRET'],
      runtimeVariables: { runtimeKey: 'r1' }
    };

    it('redacts secret env vars by the secret flag', () => {
      const result = buildAiVariablesPayload(variablesCollection, null);
      const token = result.find((v) => v.name === 'API_TOKEN');
      expect(token).toEqual({ name: 'API_TOKEN', value: '<redacted>', scope: 'env', secret: true });
    });

    it('redacts global env vars listed in globalEnvSecrets', () => {
      const result = buildAiVariablesPayload(variablesCollection, null);
      const gs = result.find((v) => v.name === 'GLOBAL_SECRET');
      expect(gs).toEqual({ name: 'GLOBAL_SECRET', value: '<redacted>', scope: 'global', secret: true });
    });

    it('drops disabled environment variables', () => {
      const result = buildAiVariablesPayload(variablesCollection, null);
      expect(result.find((v) => v.name === 'DISABLED')).toBeUndefined();
    });

    it('falls back to pattern-based redaction for names like *_token even without the secret flag', () => {
      const collectionWithRuntimeSecret = {
        activeEnvironmentUid: null,
        environments: [],
        globalEnvironmentVariables: {},
        globalEnvSecrets: [],
        runtimeVariables: { access_token: 'should-not-leak' }
      };
      const result = buildAiVariablesPayload(collectionWithRuntimeSecret, null);
      const v = result.find((x) => x.name === 'access_token');
      expect(v).toEqual({ name: 'access_token', value: '<redacted>', scope: 'runtime', secret: true });
    });

    it('sends the real value for a pattern-only name when redactVariables is off', () => {
      const collectionWithRuntimeSecret = {
        activeEnvironmentUid: null,
        environments: [],
        globalEnvironmentVariables: {},
        globalEnvSecrets: [],
        runtimeVariables: { access_token: 'real-value' }
      };
      const result = buildAiVariablesPayload(collectionWithRuntimeSecret, null, false);
      const v = result.find((x) => x.name === 'access_token');
      expect(v).toEqual({ name: 'access_token', value: 'real-value', scope: 'runtime', secret: false });
    });

    it('keeps explicitly-secret vars redacted even when redactVariables is off', () => {
      const collectionWithExplicitSecret = {
        activeEnvironmentUid: 'env-1',
        environments: [
          { uid: 'env-1', variables: [{ name: 'MY_SECRET', value: 'v', enabled: true, secret: true }] }
        ],
        globalEnvironmentVariables: {},
        globalEnvSecrets: [],
        runtimeVariables: {}
      };
      const result = buildAiVariablesPayload(collectionWithExplicitSecret, null, false);
      const v = result.find((x) => x.name === 'MY_SECRET');
      expect(v).toEqual({ name: 'MY_SECRET', value: '<redacted>', scope: 'env', secret: true });
    });

    it('does not duplicate a name across scopes (env wins over global)', () => {
      const collectionWithCollision = {
        activeEnvironmentUid: 'env-1',
        environments: [
          { uid: 'env-1', variables: [{ name: 'SHARED', value: 'env-val', enabled: true, secret: false }] }
        ],
        globalEnvironmentVariables: { SHARED: 'global-val' },
        globalEnvSecrets: [],
        runtimeVariables: {}
      };
      const result = buildAiVariablesPayload(collectionWithCollision, null);
      const shared = result.filter((v) => v.name === 'SHARED');
      expect(shared).toHaveLength(1);
      expect(shared[0]).toEqual({ name: 'SHARED', value: 'env-val', scope: 'env', secret: false });
    });

    it('lets runtime override env when both define the same name', () => {
      const collectionWithOverride = {
        activeEnvironmentUid: 'env-1',
        environments: [
          { uid: 'env-1', variables: [{ name: 'API_URL', value: 'env-url', enabled: true, secret: false }] }
        ],
        globalEnvironmentVariables: {},
        globalEnvSecrets: [],
        runtimeVariables: { API_URL: 'runtime-url' }
      };
      const result = buildAiVariablesPayload(collectionWithOverride, null);
      const shared = result.filter((v) => v.name === 'API_URL');
      expect(shared).toHaveLength(1);
      expect(shared[0]).toEqual({ name: 'API_URL', value: 'runtime-url', scope: 'runtime', secret: false });
    });

    it('keeps secret stickiness across scopes — env-secret value stays redacted even if runtime overrides', () => {
      // If env declares API_TOKEN as secret and runtime overrides it, the
      // runtime value should still be redacted.
      const collectionWithSecretOverride = {
        activeEnvironmentUid: 'env-1',
        environments: [
          { uid: 'env-1', variables: [{ name: 'API_TOKEN', value: 'env-tok', enabled: true, secret: true }] }
        ],
        globalEnvironmentVariables: {},
        globalEnvSecrets: [],
        runtimeVariables: { API_TOKEN: 'runtime-tok' }
      };
      const result = buildAiVariablesPayload(collectionWithSecretOverride, null);
      const tok = result.find((v) => v.name === 'API_TOKEN');
      // scope tracks the source the user would actually hit; the value stays
      // redacted because env marked the name secret.
      expect(tok.value).toBe('<redacted>');
      expect(tok.secret).toBe(true);
    });

    it('redacts OAuth2 credentials with scope = oauth2', () => {
      const collectionWithOauth = {
        activeEnvironmentUid: null,
        environments: [],
        globalEnvironmentVariables: {},
        globalEnvSecrets: [],
        runtimeVariables: {},
        oauth2Credentials: [
          {
            credentialsId: 'github',
            credentials: { access_token: 'real-tok', token_type: 'Bearer' }
          }
        ]
      };
      const result = buildAiVariablesPayload(collectionWithOauth, null);
      const tok = result.find((v) => v.name === '$oauth2.github.access_token');
      expect(tok).toBeDefined();
      expect(tok.value).toBe('<redacted>');
      expect(tok.secret).toBe(true);
      expect(result.some((v) => v.name === '$oauth2.github.access_token' && v.scope === 'collection' && !v.secret)).toBe(false);
    });

    it('redacts generic token names like refresh_token / id_token / TOKEN by pattern', () => {
      const collectionWithVariousTokens = {
        activeEnvironmentUid: null,
        environments: [],
        globalEnvironmentVariables: {},
        globalEnvSecrets: [],
        runtimeVariables: { refresh_token: 'r', id_token: 'i', csrfToken: 'c', TOKEN: 't' }
      };
      const result = buildAiVariablesPayload(collectionWithVariousTokens, null);
      for (const name of ['refresh_token', 'id_token', 'csrfToken', 'TOKEN']) {
        const v = result.find((x) => x.name === name);
        expect(v).toBeDefined();
        expect(v.value).toBe('<redacted>');
        expect(v.secret).toBe(true);
      }
    });

    it('returns an empty array when no collection is supplied', () => {
      expect(buildAiVariablesPayload(null, null)).toEqual([]);
    });
  });

  describe('buildAiContextPayload', () => {
    it('combines request context and variables into a single payload', () => {
      const result = buildAiContextPayload(null, null);
      expect(result).toEqual({ requestContext: null, variables: [] });
    });
  });
});
