const { interpolate } = require('@usebruno/common');
const { setAuthHeaders } = require('../../src/ipc/network/prepare-request');
const prepareGqlIntrospectionRequest = require('../../src/ipc/network/prepare-gql-introspection-request');
const { fetchGqlSchema } = require('../../src/ipc/network');

// Mock the module
jest.mock('../../src/ipc/network/prepare-gql-introspection-request', () => {
  return jest.fn().mockReturnValue({
    method: 'POST',
    url: 'https://example.com/',
    headers: {},
    data: '{}'
  });
});

describe('Prepare GQL Introspection Request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should receive combined variables from fetchGqlSchema', async () => {
    const endpoint = 'https://example.com/';
    const environment = {
      variables: [
        { name: 'API_TOKEN', value: 'secret-token', enabled: true },
        { name: 'ENV_VAR', value: 'env-value', enabled: true }
      ]
    };
    const request = {
      vars: {
        requestVar: 'request-value'
      },
      headers: [
        { name: 'Authorization', value: 'Bearer {{API_TOKEN}}', enabled: true }
      ]
    };
    const collection = {
      uid: 'test-collection',
      pathname: '/test',
      runtimeVariables: {
        runtimeVar: 'runtime-value'
      },
      globalEnvironmentVariables: {
        globalVar: 'global-value'
      },
      root: {
        request: {
          headers: []
        }
      }
    };

    await fetchGqlSchema(endpoint, environment, request, collection);

    expect(prepareGqlIntrospectionRequest).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        API_TOKEN: 'secret-token',
        ENV_VAR: 'env-value',
        requestVar: 'request-value',
        runtimeVar: 'runtime-value',
        globalVar: 'global-value'
      }),
      request,
      collection.root
    );
  });
});
