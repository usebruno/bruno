const prepareRequest = require('../../src/runner/prepare-request');

describe('collection with basic auth', () => {
  const collectionRoot = {
    request: {
      auth: {
        mode: 'basic',
        basic: {
          username: 'mockusername',
          password: 'password'
        }
      }
    }
  };

  it('should retain auth when request has no auth configuration', () => {
    const readyRequest = prepareRequest({}, collectionRoot);

    expect(readyRequest.auth).toMatchObject(collectionRoot.request.auth.basic);
    expect(readyRequest.headers).toMatchObject({});
  });

  it('should be overridden by request with bearer auth', () => {
    const request = {
      auth: {
        mode: 'bearer',
        // basic ignored based on mode
        basic: {
          username: 'username',
          password: 'password'
        },
        bearer: {
          token: 'SomeTokenOnREQUEST'
        }
      }
    };

    const readyRequest = prepareRequest(request, collectionRoot);

    // Would benefit from specific token pattern
    expect(readyRequest.headers['authorization']).toMatch(/^Bearer .+$/);
  });

  it('should be overridden by request with basic auth', () => {
    const request = {
      auth: {
        mode: 'basic',
        // basic ignored based on mode
        basic: {
          username: 'username',
          password: 'password'
        },
        bearer: {
          token: 'SomeTokenOnREQUEST'
        }
      }
    };

    const readyRequest = prepareRequest(request, collectionRoot);

    expect(readyRequest.auth).toMatchObject(request.auth.basic);
    expect(readyRequest.headers).toMatchObject({});
  });
});

describe('collection with bearer auth', () => {
  const collectionRoot = {
    request: {
      auth: {
        mode: 'bearer',
        bearer: {
          token: 'SomeTokenOnCOLLECTION'
        }
      }
    }
  };

  it('should retain auth when request has no auth configuration', () => {
    const readyRequest = prepareRequest({}, collectionRoot);

    expect(readyRequest.auth).toBeUndefined();
    // Would benefit from specific token pattern
    expect(readyRequest.headers['authorization']).toMatch(/^Bearer .+$/);
  });

  it('should be overridden by request with bearer auth', () => {
    const request = {
      auth: {
        mode: 'bearer',
        // basic ignored based on mode
        basic: {
          username: 'username',
          password: 'password'
        },
        bearer: {
          token: 'SomeTokenOnREQUEST'
        }
      }
    };

    const readyRequest = prepareRequest(request, collectionRoot);

    // Would benefit from specific token pattern
    expect(readyRequest.headers['authorization']).toMatch(/^Bearer .+$/);
  });

  it('should be overridden by request with basic auth', () => {
    const request = {
      auth: {
        mode: 'basic',
        basic: {
          username: 'username',
          password: 'password'
        },
        // bearer ignored based on mode
        bearer: {
          token: 'SomeTokenOnREQUEST'
        }
      }
    };

    const readyRequest = prepareRequest(request, collectionRoot);

    expect(readyRequest.auth).toMatchObject(request.auth.basic);
    expect(readyRequest.headers).toMatchObject({});
  });
});
