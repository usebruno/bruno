const { fetchGqlSchemaHandler } = require('../../src/ipc/network');

jest.mock('../../src/ipc/network/prepare-gql-introspection-request', () => {
  return jest.fn().mockImplementation((endpoint, vars, request, root) => {
    return {
      url: endpoint,
      method: 'POST',
      headers: request?.headers || {},
      data: {
        query: '{ __schema { types { name } } }'
      }
    };
  });
});

const makeCollection = () => ({
  uid: 'test-collection',
  pathname: '/test',
  runtimeVariables: {},
  globalEnvironmentVariables: {},
  items: [
    {
      uid: 'test-request',
      request: { vars: { req: [] } }
    }
  ],
  root: {
    request: {
      headers: [],
      vars: { req: [] }
    }
  }
});

const makeRequest = () => ({
  uid: 'test-request',
  vars: { req: [] }
});

const environment = { variables: [] };

describe('fetchGqlSchemaHandler - network error handling', () => {
  beforeAll(async () => {
    try {
      await fetchGqlSchemaHandler(null, 'http://127.0.0.1:19999/graphql', environment, makeRequest(), makeCollection());
    } catch (e) {
      // Expected to fail — just warming up the handler
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return a friendly error for ECONNREFUSED', async () => {
    const endpoint = 'http://127.0.0.1:19999/graphql';

    await expect(
      fetchGqlSchemaHandler(null, endpoint, environment, makeRequest(), makeCollection())
    ).rejects.toThrow('Connection refused by the server. The server may be down or not accepting connections.');
  });

  it('should return a friendly error for ENOTFOUND (DNS resolution failure)', async () => {
    const endpoint = 'https://this-domain-does-not-exist-12345.com/graphql';

    await expect(
      fetchGqlSchemaHandler(null, endpoint, environment, makeRequest(), makeCollection())
    ).rejects.toThrow(/Unable to reach the server.*Please check the URL and your network connection/);
  }, 10000);

  it('should not expose raw error codes in ECONNREFUSED message', async () => {
    expect.assertions(2);
    const endpoint = 'http://127.0.0.1:19999/graphql';

    try {
      await fetchGqlSchemaHandler(null, endpoint, environment, makeRequest(), makeCollection());
    } catch (err) {
      expect(err.message).not.toMatch(/ECONNREFUSED/);
      expect(err.message).toContain('Connection refused');
    }
  });

  it('should not expose raw error codes in ENOTFOUND message', async () => {
    expect.assertions(3);
    const endpoint = 'https://this-domain-does-not-exist-12345.com/graphql';

    try {
      await fetchGqlSchemaHandler(null, endpoint, environment, makeRequest(), makeCollection());
    } catch (err) {
      expect(err.message).not.toMatch(/ENOTFOUND/);
      expect(err.message).not.toMatch(/getaddrinfo/);
      expect(err.message).toContain('Unable to reach the server');
    }
  }, 10000);
});
