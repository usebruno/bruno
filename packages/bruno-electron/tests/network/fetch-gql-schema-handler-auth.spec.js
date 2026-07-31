const { makeAxiosInstance } = require('../../src/ipc/network/axios-instance');

// The axios instance is the only thing stubbed: prepareGqlIntrospectionRequest
// runs for real, so these tests assert the request that would go on the wire.
jest.mock('../../src/ipc/network/axios-instance', () => ({
  makeAxiosInstance: jest.fn()
}));

const { fetchGqlSchemaHandler } = require('../../src/ipc/network');

const collectionWith = (folderAuth) => ({
  uid: 'test-collection',
  pathname: '/test',
  runtimeVariables: {},
  globalEnvironmentVariables: {},
  items: [
    {
      uid: 'test-folder',
      type: 'folder',
      root: {
        request: {
          auth: folderAuth,
          vars: { req: [] }
        }
      },
      items: [
        {
          uid: 'test-request',
          request: {
            vars: { req: [] }
          }
        }
      ]
    }
  ],
  root: {
    request: {
      headers: [],
      auth: { mode: 'none' },
      vars: { req: [] }
    }
  }
});

describe('fetchGqlSchemaHandler - auth on the introspection request', () => {
  let sentRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    sentRequest = null;
    const instance = jest.fn(async (config) => {
      sentRequest = config;
      return { status: 200, data: { data: { __schema: { types: [] } } } };
    });
    instance.interceptors = {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    };
    makeAxiosInstance.mockReturnValue(instance);
  });

  it('sends the folder auth when the request inherits it', async () => {
    const request = {
      uid: 'test-request',
      auth: { mode: 'inherit' },
      vars: { req: [] }
    };
    const collection = collectionWith({ mode: 'bearer', bearer: { token: 'folder-token' } });

    await fetchGqlSchemaHandler(null, 'https://example.com/graphql', { variables: [] }, request, collection);

    expect(sentRequest.headers['Authorization']).toBe('Bearer folder-token');
  });

  it('keeps sending the request\'s own auth when it does not inherit', async () => {
    const request = {
      uid: 'test-request',
      auth: { mode: 'bearer', bearer: { token: 'request-token' } },
      vars: { req: [] }
    };
    const collection = collectionWith({ mode: 'bearer', bearer: { token: 'folder-token' } });

    await fetchGqlSchemaHandler(null, 'https://example.com/graphql', { variables: [] }, request, collection);

    expect(sentRequest.headers['Authorization']).toBe('Bearer request-token');
  });

  it('does not mutate the request object it was given', async () => {
    const request = {
      uid: 'test-request',
      auth: { mode: 'inherit' },
      vars: { req: [] }
    };
    const collection = collectionWith({ mode: 'bearer', bearer: { token: 'folder-token' } });

    await fetchGqlSchemaHandler(null, 'https://example.com/graphql', { variables: [] }, request, collection);

    expect(request.auth).toEqual({ mode: 'inherit' });
  });

  // Older request files can have no auth block at all: bruno-schema marks it
  // nullable. Both mergeAuth and setAuthHeaders read auth.mode unguarded, so
  // without normalising it the introspection call fails outright whenever the
  // collection root carries auth.
  it('handles a request with no auth block at all', async () => {
    const request = {
      uid: 'test-request',
      vars: { req: [] }
    };
    const collection = collectionWith({ mode: 'bearer', bearer: { token: 'folder-token' } });
    collection.root.request.auth = { mode: 'bearer', bearer: { token: 'collection-token' } };

    await fetchGqlSchemaHandler(null, 'https://example.com/graphql', { variables: [] }, request, collection);

    expect(sentRequest.headers['Authorization']).toBeUndefined();
  });
});
