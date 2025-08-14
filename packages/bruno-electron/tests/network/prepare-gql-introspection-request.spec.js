const prepareGqlIntrospectionRequest = require('../../src/ipc/network/prepare-gql-introspection-request');

describe('prepareGqlIntrospectionRequest', () => {
  const createBasicSetup = () => ({
    endpoint: 'https://example.com/',
    request: {
      headers: []
    },
    collectionRoot: {
      request: {
        headers: []
      }
    }
  });


  it('should override collection headers with request headers', () => {
    const setup = createBasicSetup();
    setup.collectionRoot.request.headers = [
      { name: 'X-Header', value: 'collection-value', enabled: true }
    ];
    setup.request.headers = [
      { name: 'X-Header', value: 'request-value', enabled: true }
    ];

    const result = prepareGqlIntrospectionRequest(setup.endpoint, {}, setup.request, setup.collectionRoot);

    expect(result.headers['X-Header']).toBe('request-value');
  });

  it('should handle enabled and disabled headers', () => {
    const setup = createBasicSetup();
    setup.request.headers = [
      { name: 'X-Enabled', value: 'enabled', enabled: true },
      { name: 'X-Disabled', value: 'disabled', enabled: false }
    ];

    const result = prepareGqlIntrospectionRequest(setup.endpoint, {}, setup.request, setup.collectionRoot);

    expect(result.headers['X-Enabled']).toBe('enabled');
    expect(result.headers['X-Disabled']).toBeUndefined();
  });

  it('should always include required GraphQL headers', () => {
    const setup = createBasicSetup();
    const result = prepareGqlIntrospectionRequest(setup.endpoint, {}, setup.request, setup.collectionRoot);
    expect(result.headers['Accept']).toBe('application/json');
    expect(result.headers['Content-Type']).toBe('application/json');
  });

});