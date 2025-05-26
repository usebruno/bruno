const prepareGqlIntrospectionRequest = require('../../src/ipc/network/prepare-gql-introspection-request');
const { fetchGqlSchemaHandler } = require('../../src/ipc/network');

// Mock the modules first, before requiring them
jest.mock('../../src/utils/collection', () => {
  const original = jest.requireActual('../../src/utils/collection');
  return {
    ...original,
    getTreePathFromCollectionToItem: jest.fn().mockReturnValue([]),
    mergeVars: jest.fn(),
    getEnvVars: jest.fn(env => {
      if (!env || !env.variables) return {};
      return env.variables.reduce((acc, variable) => {
        if (variable.enabled) {
          acc[variable.name] = variable.value;
        }
        return acc;
      }, {});
    })
  };
});

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

describe('fetchGqlSchemaHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should receive combined variables from fetchGqlSchemaHandler', async () => {
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

    await fetchGqlSchemaHandler(null, endpoint, environment, request, collection);

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

  it('should override global environment variables with environment variables', async () => {
    const endpoint = 'https://example.com/';
    const environment = {
      variables: [
        { name: 'SHARED_VAR', value: 'env-value', enabled: true }
      ]
    };
    const request = {
      vars: {}
    };
    const collection = {
      uid: 'test-collection',
      pathname: '/test',
      runtimeVariables: {},
      globalEnvironmentVariables: {
        SHARED_VAR: 'global-value'
      },
      root: {
        request: {
          headers: []
        }
      }
    };

    await fetchGqlSchemaHandler(null, endpoint, environment, request, collection);

    expect(prepareGqlIntrospectionRequest).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        SHARED_VAR: 'env-value'
      }),
      request,
      collection.root
    );
  });

  it('should override environment variables with collection runtime variables', async () => {
    const endpoint = 'https://example.com/';
    const environment = {
      variables: [
        { name: 'SHARED_VAR', value: 'env-value', enabled: true }
      ]
    };
    const request = {
      vars: {}
    };
    const collection = {
      uid: 'test-collection',
      pathname: '/test',
      runtimeVariables: {
        SHARED_VAR: 'runtime-value'
      },
      globalEnvironmentVariables: {},
      root: {
        request: {
          headers: []
        }
      }
    };

    await fetchGqlSchemaHandler(null, endpoint, environment, request, collection);

    expect(prepareGqlIntrospectionRequest).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        SHARED_VAR: 'runtime-value'
      }),
      request,
      collection.root
    );
  });

  it('should override collection runtime variables with request runtime variables', async () => {
    const endpoint = 'https://example.com/';
    const environment = {
      variables: []
    };
    const request = {
      vars: {
        SHARED_VAR: 'request-value'
      }
    };
    const collection = {
      uid: 'test-collection',
      pathname: '/test',
      runtimeVariables: {
        SHARED_VAR: 'runtime-value'
      },
      globalEnvironmentVariables: {},
      root: {
        request: {
          headers: []
        }
      }
    };

    await fetchGqlSchemaHandler(null, endpoint, environment, request, collection);

    expect(prepareGqlIntrospectionRequest).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        SHARED_VAR: 'request-value'
      }),
      request,
      collection.root
    );
  });

  it('should override global environment with request runtime variables', async () => {
    const endpoint = 'https://example.com/';
    const environment = {
      variables: []
    };
    const request = {
      vars: {
        SHARED_VAR: 'request-value'
      }
    };
    const collection = {
      uid: 'test-collection',
      pathname: '/test',
      runtimeVariables: {},
      globalEnvironmentVariables: {
        SHARED_VAR: 'global-value'
      },
      root: {
        request: {
          headers: []
        }
      }
    };

    await fetchGqlSchemaHandler(null, endpoint, environment, request, collection);

    expect(prepareGqlIntrospectionRequest).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        SHARED_VAR: 'request-value'
      }),
      request,
      collection.root
    );
  });

  it('should override global environment with collection runtime variables', async () => {
    const endpoint = 'https://example.com/';
    const environment = {
      variables: []
    };
    const request = {
      vars: {}
    };
    const collection = {
      uid: 'test-collection',
      pathname: '/test',
      runtimeVariables: {
        SHARED_VAR: 'runtime-value'
      },
      globalEnvironmentVariables: {
        SHARED_VAR: 'global-value'
      },
      root: {
        request: {
          headers: []
        }
      }
    };

    await fetchGqlSchemaHandler(null, endpoint, environment, request, collection);

    expect(prepareGqlIntrospectionRequest).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        SHARED_VAR: 'runtime-value'
      }),
      request,
      collection.root
    );
  });

  it('should override environment variables with folder-level variables', async () => {
    const endpoint = 'https://example.com/';
    const environment = {
      variables: [
        { name: 'SHARED_VAR', value: 'env-value', enabled: true }
      ]
    };
    const request = {
      vars: {},
      folderVariables: {
        SHARED_VAR: 'folder-value'
      }
    };
    const collection = {
      uid: 'test-collection',
      pathname: '/test',
      runtimeVariables: {},
      globalEnvironmentVariables: {},
      root: {
        request: {
          headers: []
        }
      }
    };

    await fetchGqlSchemaHandler(null, endpoint, environment, request, collection);

    expect(prepareGqlIntrospectionRequest).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        SHARED_VAR: 'folder-value'
      }),
      request,
      collection.root
    );
  });

  it('should override collection runtime variables with folder-level variables', async () => {
    const endpoint = 'https://example.com/';
    const environment = {
      variables: []
    };
    const request = {
      vars: {},
      folderVariables: {
        SHARED_VAR: 'folder-value'
      }
    };
    const collection = {
      uid: 'test-collection',
      pathname: '/test',
      runtimeVariables: {
        SHARED_VAR: 'runtime-value'
      },
      globalEnvironmentVariables: {},
      root: {
        request: {
          headers: []
        }
      }
    };

    await fetchGqlSchemaHandler(null, endpoint, environment, request, collection);

    expect(prepareGqlIntrospectionRequest).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        SHARED_VAR: 'folder-value'
      }),
      request,
      collection.root
    );
  });
});


