const { getIntrospectionQuery } = require('graphql');
const prepareGqlIntrospectionRequest = require('../../src/ipc/network/prepare-gql-introspection-request');
const { setAuthHeaders } = require('../../src/ipc/network/prepare-request');

// Mock the setAuthHeaders function
jest.mock('../../src/ipc/network/prepare-request', () => ({
  setAuthHeaders: jest.fn(req => req)
}));

describe('prepareGqlIntrospectionRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a basic GraphQL introspection request', () => {
    const endpoint = 'https://api.example.com/graphql';
    const request = { headers: [] };
    const collectionRoot = {};

    const result = prepareGqlIntrospectionRequest(endpoint, {}, request, collectionRoot);

    expect(result).toEqual({
      method: 'POST',
      url: 'https://api.example.com/graphql',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        query: getIntrospectionQuery()
      })
    });
    expect(setAuthHeaders).toHaveBeenCalledWith(expect.any(Object), request, collectionRoot);
  });

  it('should interpolate variables in the endpoint', () => {
    const endpoint = 'https://{{host}}/{{path}}';
    const variables = {
      host: 'api.example.com',
      path: 'graphql'
    };
    const request = { headers: [] };
    const collectionRoot = {};

    const result = prepareGqlIntrospectionRequest(endpoint, variables, request, collectionRoot);

    expect(result.url).toBe('https://api.example.com/graphql');
  });

  it('should include request headers when enabled', () => {
    const endpoint = 'https://api.example.com/graphql';
    const request = {
      headers: [
        { name: 'Authorization', value: 'Bearer token123', enabled: true },
        { name: 'X-Custom', value: 'value1', enabled: true },
        { name: 'X-Disabled', value: 'ignored', enabled: false }
      ]
    };
    const collectionRoot = {};

    const result = prepareGqlIntrospectionRequest(endpoint, {}, request, collectionRoot);

    expect(result.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123',
      'X-Custom': 'value1'
    });
  });

  it('should include collection headers when enabled', () => {
    const endpoint = 'https://api.example.com/graphql';
    const request = { headers: [] };
    const collectionRoot = {
      request: {
        headers: [
          { name: 'X-API-Key', value: 'api-key-123', enabled: true },
          { name: 'X-Tenant', value: 'tenant-id', enabled: true },
          { name: 'X-Disabled-Collection', value: 'ignored', enabled: false }
        ]
      }
    };

    const result = prepareGqlIntrospectionRequest(endpoint, {}, request, collectionRoot);

    expect(result.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': 'api-key-123',
      'X-Tenant': 'tenant-id'
    });
  });

  it('should merge request and collection headers', () => {
    const endpoint = 'https://api.example.com/graphql';
    const request = {
      headers: [
        { name: 'Authorization', value: 'Bearer token123', enabled: true },
        { name: 'X-Custom', value: 'request-value', enabled: true }
      ]
    };
    const collectionRoot = {
      request: {
        headers: [
          { name: 'X-API-Key', value: 'api-key-123', enabled: true },
          { name: 'X-Custom', value: 'collection-value', enabled: true } // This should be overridden by request header
        ]
      }
    };

    const result = prepareGqlIntrospectionRequest(endpoint, {}, request, collectionRoot);

    expect(result.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123',
      'X-Custom': 'request-value',
      'X-API-Key': 'api-key-123'
    });
  });

  it('should call setAuthHeaders with the request, request object, and collectionRoot', () => {
    const endpoint = 'https://api.example.com/graphql';
    const request = { headers: [] };
    const collectionRoot = { some: 'data' };

    prepareGqlIntrospectionRequest(endpoint, {}, request, collectionRoot);

    expect(setAuthHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: endpoint,
        headers: expect.any(Object),
        data: expect.any(String)
      }),
      request,
      collectionRoot
    );
  });

  it('should handle empty endpoint', () => {
    const endpoint = '';
    const request = { headers: [] };
    const collectionRoot = {};

    const result = prepareGqlIntrospectionRequest(endpoint, {}, request, collectionRoot);

    expect(result.url).toBe('');
  });
});

describe('prepareGqlIntrospectionRequest - variable precedence and redundancy', () => {
  const endpointTemplate = 'https://api.example.com/{{foo}}/{{bar}}';

  it('should use variable from envVars if not present in higher precedence', () => {
    const endpoint = endpointTemplate;
    const combinedVars = { foo: 'fromEnv', bar: 'fromEnv' };
    const request = { headers: [] };
    const collectionRoot = {};
    const result = prepareGqlIntrospectionRequest(endpoint, combinedVars, request, collectionRoot);
    expect(result.url).toBe('https://api.example.com/fromEnv/fromEnv');
  });

  it('should use variable from globalEnvironmentVars if present (highest precedence)', () => {
    // Simulate merge order: requestVars < collectionVars < envVars < globalEnvVars
    const endpoint = endpointTemplate;
    const requestVars = { foo: 'fromRequest', bar: 'fromRequest' };
    const collectionVars = { foo: 'fromCollection' };
    const envVars = { foo: 'fromEnv', bar: 'fromEnv' };
    const globalEnvVars = { foo: 'fromGlobal', bar: 'fromGlobal' };
    // merge order: requestVars, collectionVars, envVars, globalEnvVars
    const combinedVars = Object.assign({}, requestVars, collectionVars, envVars, globalEnvVars);
    const request = { headers: [] };
    const collectionRoot = {};
    const result = prepareGqlIntrospectionRequest(endpoint, combinedVars, request, collectionRoot);
    expect(result.url).toBe('https://api.example.com/fromGlobal/fromGlobal');
  });

  it('should use variable from envVars if not present in globalEnvironmentVars', () => {
    const endpoint = endpointTemplate;
    const requestVars = { foo: 'fromRequest', bar: 'fromRequest' };
    const collectionVars = { foo: 'fromCollection' };
    const envVars = { foo: 'fromEnv', bar: 'fromEnv' };
    const globalEnvVars = { foo: 'fromGlobal' }; // bar missing
    const combinedVars = Object.assign({}, requestVars, collectionVars, envVars, globalEnvVars);
    const request = { headers: [] };
    const collectionRoot = {};
    const result = prepareGqlIntrospectionRequest(endpoint, combinedVars, request, collectionRoot);
    expect(result.url).toBe('https://api.example.com/fromGlobal/fromEnv');
  });

  it('should use variable from collectionVars if not present in envVars or globalEnvironmentVars', () => {
    const endpoint = endpointTemplate;
    const requestVars = { foo: 'fromRequest', bar: 'fromRequest' };
    const collectionVars = { foo: 'fromCollection', bar: 'fromCollection' };
    const envVars = { foo: 'fromEnv' }; // bar missing
    const globalEnvVars = {}; // none
    const combinedVars = Object.assign({}, requestVars, collectionVars, envVars, globalEnvVars);
    const request = { headers: [] };
    const collectionRoot = {};
    const result = prepareGqlIntrospectionRequest(endpoint, combinedVars, request, collectionRoot);
    expect(result.url).toBe('https://api.example.com/fromEnv/fromCollection');
  });

  it('should use variable from requestVars if not present in higher precedence', () => {
    const endpoint = endpointTemplate;
    const requestVars = { foo: 'fromRequest', bar: 'fromRequest' };
    const collectionVars = {}; // none
    const envVars = {}; // none
    const globalEnvVars = {}; // none
    const combinedVars = Object.assign({}, requestVars, collectionVars, envVars, globalEnvVars);
    const request = { headers: [] };
    const collectionRoot = {};
    const result = prepareGqlIntrospectionRequest(endpoint, combinedVars, request, collectionRoot);
    expect(result.url).toBe('https://api.example.com/fromRequest/fromRequest');
  });

  it('should handle missing variables gracefully', () => {
    const endpoint = 'https://api.example.com/{{foo}}/{{bar}}/{{baz}}';
    const combinedVars = { foo: 'fooValue' };
    const request = { headers: [] };
    const collectionRoot = {};
    const result = prepareGqlIntrospectionRequest(endpoint, combinedVars, request, collectionRoot);
    // Unresolved variables remain as is
    expect(result.url).toBe('https://api.example.com/fooValue/{{bar}}/{{baz}}');
  });

  it('should handle redundant variables and show correct precedence', () => {
    // foo in all, bar only in requestVars
    const endpoint = endpointTemplate;
    const requestVars = { foo: 'fromRequest', bar: 'fromRequest' };
    const collectionVars = { foo: 'fromCollection' };
    const envVars = { foo: 'fromEnv' };
    const globalEnvVars = { foo: 'fromGlobal' };
    // merge order: requestVars, collectionVars, envVars, globalEnvVars
    const combinedVars = Object.assign({}, requestVars, collectionVars, envVars, globalEnvVars);
    const request = { headers: [] };
    const collectionRoot = {};
    const result = prepareGqlIntrospectionRequest(endpoint, combinedVars, request, collectionRoot);
    expect(result.url).toBe('https://api.example.com/fromGlobal/fromRequest');
  });
});

describe('prepareGqlIntrospectionRequest - header precedence', () => {
  it('should use request header over collection header if names overlap', () => {
    const endpoint = 'https://api.example.com/graphql';
    const request = {
      headers: [
        { name: 'X-Overlap', value: 'request-value', enabled: true },
        { name: 'X-Unique', value: 'unique-value', enabled: true }
      ]
    };
    const collectionRoot = {
      request: {
        headers: [
          { name: 'X-Overlap', value: 'collection-value', enabled: true },
          { name: 'X-Collection', value: 'collection-header', enabled: true }
        ]
      }
    };
    const result = prepareGqlIntrospectionRequest(endpoint, {}, request, collectionRoot);
    expect(result.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Overlap': 'request-value',
      'X-Unique': 'unique-value',
      'X-Collection': 'collection-header'
    });
  });

  it('should not include disabled headers from either source', () => {
    const endpoint = 'https://api.example.com/graphql';
    const request = {
      headers: [
        { name: 'X-Enabled', value: 'enabled', enabled: true },
        { name: 'X-Disabled', value: 'should-not-appear', enabled: false }
      ]
    };
    const collectionRoot = {
      request: {
        headers: [
          { name: 'X-Collection-Enabled', value: 'enabled', enabled: true },
          { name: 'X-Collection-Disabled', value: 'should-not-appear', enabled: false }
        ]
      }
    };
    const result = prepareGqlIntrospectionRequest(endpoint, {}, request, collectionRoot);
    expect(result.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Enabled': 'enabled',
      'X-Collection-Enabled': 'enabled'
    });
  });
});
