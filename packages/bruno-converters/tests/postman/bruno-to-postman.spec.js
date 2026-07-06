import { sanitizeUrl, transformUrl, brunoToPostman } from '../../src/postman/bruno-to-postman';

describe('transformUrl', () => {
  it('should handle basic URL with path variables', () => {
    const url = 'https://example.com/{{username}}/api/resource/:id';
    const params = [
      { name: 'id', value: '123', type: 'path' }
    ];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'https://example.com/{{username}}/api/resource/:id',
      protocol: 'https',
      host: ['example', 'com'],
      path: ['{{username}}', 'api', 'resource', ':id'],
      query: [],
      variable: [
        { key: 'id', value: '123' }
      ]
    });
  });

  it('should handle URL with query parameters', () => {
    const url = 'https://example.com/api/resource?limit=10&offset=20';
    const params = [
      { name: 'limit', value: '10', type: 'query' },
      { name: 'offset', value: '20', type: 'query' }
    ];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'https://example.com/api/resource?limit=10&offset=20',
      protocol: 'https',
      host: ['example', 'com'],
      path: ['api', 'resource'],
      query: [
        { key: 'limit', value: '10' },
        { key: 'offset', value: '20' }
      ],
      variable: []
    });
  });

  it('should handle URL without protocol', () => {
    const url = 'example.com/api/resource';
    const params = [];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'example.com/api/resource',
      protocol: '',
      host: ['example', 'com'],
      path: ['api', 'resource'],
      query: [],
      variable: []
    });
  });
});

describe('sanitizeUrl', () => {
  it('should replace backslashes with slashes', () => {
    const input = 'http:\\\\example.com\\path\\to\\file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it('should collapse multiple slashes into a single slash', () => {
    const input = 'http://example.com//path///to////file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it('should handle URLs with mixed slashes', () => {
    const input = 'http:\\example.com//path\\to//file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });
});

describe('brunoToPostman null checks and fallbacks', () => {
  it('should handle null or undefined headers', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            headers: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.header).toEqual([]);
  });

  it('should handle null or undefined items in headers', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            headers: [
              { name: null, value: 'test-value', enabled: true },
              { name: 'Content-Type', value: null, enabled: true }
            ]
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.header).toEqual([
      { key: '', value: 'test-value', description: '', disabled: false, type: 'default' },
      { key: 'Content-Type', value: '', description: '', disabled: false, type: 'default' }
    ]);
  });

  it('should handle null or undefined body', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            body: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    // Should not have body property since we're checking for body before adding it
    expect(result.item[0].request.body).toBeUndefined();
  });

  it('should handle null or undefined body mode', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            body: {}
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    // Should use default raw mode for undefined body mode
    expect(result.item[0].request.body).toEqual({
      mode: 'raw',
      raw: ''
    });
  });

  it('should handle null or undefined formUrlEncoded array', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'formUrlEncoded',
              formUrlEncoded: null
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'urlencoded',
      urlencoded: []
    });
  });

  it('should handle null or undefined multipartForm array', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: null
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'formdata',
      formdata: []
    });
  });

  it('should handle null or undefined items in form data', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'formUrlEncoded',
              formUrlEncoded: [
                { name: null, value: 'test-value', enabled: true },
                { name: 'field', value: null, enabled: true }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body.urlencoded).toEqual([
      { key: '', value: 'test-value', disabled: false, type: 'default', description: '' },
      { key: 'field', value: '', disabled: false, type: 'default', description: '' }
    ]);
  });

  it('should handle null or undefined method', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            url: 'https://example.com',
            method: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.method).toBe('GET');
  });

  it('should handle null or undefined url', () => {
    // Mock console.error to prevent it from logging during test
    const originalConsoleError = console.error;
    console.error = jest.fn();

    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.url.raw).toBe('');
  });

  it('should handle null or undefined params', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            params: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.url.variable).toEqual([]);
  });

  it('should handle null or undefined docs', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            docs: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.description).toBe('');
  });

  it('should pass through header and form field descriptions', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            headers: [
              { name: 'X-Custom', value: 'v', enabled: true, description: 'Header note' }
            ],
            body: {
              mode: 'formUrlEncoded',
              formUrlEncoded: [
                { name: 'field', value: 'val', enabled: true, description: 'Field note' }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.header).toEqual([
      expect.objectContaining({ key: 'X-Custom', value: 'v', description: 'Header note' })
    ]);
    expect(result.item[0].request.body.urlencoded).toEqual([
      expect.objectContaining({ key: 'field', value: 'val', description: 'Field note' })
    ]);
  });

  it('should handle null or undefined folder name', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: null,
          items: []
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].name).toBe('Untitled Folder');
  });

  it('should handle null or undefined request name', () => {
    const simpleCollection = {
      items: [
        {
          type: 'http-request',
          name: null,
          request: {
            method: 'GET',
            url: 'https://example.com'
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].name).toBe('Untitled Request');
  });

  it('should handle null or undefined folder items', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: 'Test Folder',
          items: null
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].item).toEqual([]);
  });
});

describe('brunoToPostman auth export', () => {
  const makeRequestWithAuth = (auth) => ({
    items: [
      {
        name: 'Test Request',
        type: 'http-request',
        request: {
          method: 'GET',
          url: 'https://example.com',
          auth
        }
      }
    ]
  });

  it('should omit auth (undefined) for inherit mode so Postman falls back to the parent', () => {
    const result = brunoToPostman(makeRequestWithAuth({ mode: 'inherit' }));
    expect(result.item[0].request.auth).toBeUndefined();
  });

  it('should return noauth for a null or undefined auth object', () => {
    const result = brunoToPostman(makeRequestWithAuth(null));
    expect(result.item[0].request.auth).toEqual({ type: 'noauth' });
  });

  it('should export bearer auth as an array (Postman v2.1 schema)', () => {
    const result = brunoToPostman(makeRequestWithAuth({
      mode: 'bearer',
      bearer: { token: 'my-token' }
    }));
    expect(result.item[0].request.auth).toEqual({
      type: 'bearer',
      bearer: [
        { key: 'token', value: 'my-token', type: 'string' }
      ]
    });
  });

  it('should handle missing token in bearer auth', () => {
    const result = brunoToPostman(makeRequestWithAuth({
      mode: 'bearer',
      bearer: { token: null }
    }));
    expect(result.item[0].request.auth).toEqual({
      type: 'bearer',
      bearer: [
        { key: 'token', value: '', type: 'string' }
      ]
    });
  });

  it('should export basic auth (password then username)', () => {
    const result = brunoToPostman(makeRequestWithAuth({
      mode: 'basic',
      basic: { username: 'user', password: 'pass' }
    }));
    expect(result.item[0].request.auth).toEqual({
      type: 'basic',
      basic: [
        { key: 'password', value: 'pass', type: 'string' },
        { key: 'username', value: 'user', type: 'string' }
      ]
    });
  });

  it('should handle missing username/password in basic auth', () => {
    const result = brunoToPostman(makeRequestWithAuth({
      mode: 'basic',
      basic: { username: null, password: undefined }
    }));
    expect(result.item[0].request.auth).toEqual({
      type: 'basic',
      basic: [
        { key: 'password', value: '', type: 'string' },
        { key: 'username', value: '', type: 'string' }
      ]
    });
  });

  it('should export awsv4 auth mapping Bruno field names to Postman', () => {
    const result = brunoToPostman(makeRequestWithAuth({
      mode: 'awsv4',
      awsv4: {
        accessKeyId: 'AKIA',
        secretAccessKey: 'secret',
        sessionToken: 'session',
        service: 's3',
        region: 'us-east-1'
      }
    }));
    expect(result.item[0].request.auth).toEqual({
      type: 'awsv4',
      awsv4: [
        { key: 'sessionToken', value: 'session', type: 'string' },
        { key: 'service', value: 's3', type: 'string' },
        { key: 'region', value: 'us-east-1', type: 'string' },
        { key: 'secretKey', value: 'secret', type: 'string' },
        { key: 'accessKey', value: 'AKIA', type: 'string' }
      ]
    });
  });

  it('should export digest auth (only username/password, Postman-only keys dropped)', () => {
    const result = brunoToPostman(makeRequestWithAuth({
      mode: 'digest',
      digest: { username: 'user', password: 'pass' }
    }));
    expect(result.item[0].request.auth).toEqual({
      type: 'digest',
      digest: [
        { key: 'password', value: 'pass', type: 'string' },
        { key: 'username', value: 'user', type: 'string' }
      ]
    });
  });

  it('should export ntlm auth (username/password/domain)', () => {
    const result = brunoToPostman(makeRequestWithAuth({
      mode: 'ntlm',
      ntlm: { username: 'user', password: 'pass', domain: 'CORP' }
    }));
    expect(result.item[0].request.auth).toEqual({
      type: 'ntlm',
      ntlm: [
        { key: 'username', value: 'user', type: 'string' },
        { key: 'password', value: 'pass', type: 'string' },
        { key: 'domain', value: 'CORP', type: 'string' }
      ]
    });
  });

  describe('oauth1', () => {
    it('should export oauth1 with HMAC signature (no privateKey emitted)', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'oauth1',
        oauth1: {
          consumerKey: 'ck',
          consumerSecret: 'cs',
          accessToken: 'at',
          accessTokenSecret: 'ats',
          signatureMethod: 'HMAC-SHA1',
          callbackUrl: 'https://cb',
          verifier: 'v',
          timestamp: '123',
          nonce: 'n',
          version: '1.0',
          realm: 'r',
          placement: 'header'
        }
      }));
      expect(result.item[0].request.auth).toEqual({
        type: 'oauth1',
        oauth1: [
          { key: 'consumerKey', value: 'ck', type: 'string' },
          { key: 'consumerSecret', value: 'cs', type: 'string' },
          { key: 'token', value: 'at', type: 'string' },
          { key: 'tokenSecret', value: 'ats', type: 'string' },
          { key: 'signatureMethod', value: 'HMAC-SHA1', type: 'string' },
          { key: 'callback', value: 'https://cb', type: 'string' },
          { key: 'verifier', value: 'v', type: 'string' },
          { key: 'timestamp', value: '123', type: 'string' },
          { key: 'nonce', value: 'n', type: 'string' },
          { key: 'version', value: '1.0', type: 'string' },
          { key: 'realm', value: 'r', type: 'string' },
          { key: 'addParamsToHeader', value: true, type: 'boolean' },
          { key: 'includeBodyHash', value: false, type: 'boolean' }
        ]
      });
    });

    it('should emit privateKey for RSA signature methods', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'oauth1',
        oauth1: {
          signatureMethod: 'RSA-SHA256',
          privateKeyType: 'text',
          privateKey: '-----BEGIN PRIVATE KEY-----'
        }
      }));
      const oauth1 = result.item[0].request.auth.oauth1;
      expect(oauth1).toContainEqual({
        key: 'privateKey',
        value: '-----BEGIN PRIVATE KEY-----',
        type: 'string'
      });
    });

    it('should export an empty privateKey when RSA key is file-backed (no FS access on export)', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'oauth1',
        oauth1: {
          signatureMethod: 'RSA-SHA1',
          privateKeyType: 'file',
          privateKey: './keys/private.pem'
        }
      }));
      const oauth1 = result.item[0].request.auth.oauth1;
      expect(oauth1).toContainEqual({ key: 'privateKey', value: '', type: 'string' });
    });

    it('should set addParamsToHeader=false when placement is query', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'oauth1',
        oauth1: { placement: 'query' }
      }));
      const oauth1 = result.item[0].request.auth.oauth1;
      expect(oauth1).toContainEqual({ key: 'addParamsToHeader', value: false, type: 'boolean' });
    });
  });

  describe('oauth2', () => {
    it('should export authorization_code grant with pkce and map all fields', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'oauth2',
        oauth2: {
          grantType: 'authorization_code',
          pkce: true,
          accessTokenUrl: 'https://token',
          refreshTokenUrl: 'https://refresh',
          authorizationUrl: 'https://auth',
          callbackUrl: 'https://callback',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scope: 'read write',
          state: 'xyz',
          credentialsId: 'my-token',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          credentialsPlacement: 'body',
          username: 'user',
          password: 'pass'
        }
      }));
      expect(result.item[0].request.auth).toEqual({
        type: 'oauth2',
        oauth2: [
          { key: 'grant_type', value: 'authorization_code_with_pkce', type: 'string' },
          { key: 'accessTokenUrl', value: 'https://token', type: 'string' },
          { key: 'refreshTokenUrl', value: 'https://refresh', type: 'string' },
          { key: 'clientId', value: 'client-id', type: 'string' },
          { key: 'clientSecret', value: 'client-secret', type: 'string' },
          { key: 'scope', value: 'read write', type: 'string' },
          { key: 'state', value: 'xyz', type: 'string' },
          { key: 'tokenName', value: 'my-token', type: 'string' },
          { key: 'addTokenTo', value: 'header', type: 'string' },
          { key: 'headerPrefix', value: 'Bearer', type: 'string' },
          { key: 'client_authentication', value: 'body', type: 'string' },
          { key: 'authUrl', value: 'https://auth', type: 'string' },
          { key: 'redirect_uri', value: 'https://callback', type: 'string' },
          { key: 'username', value: 'user', type: 'string' },
          { key: 'password', value: 'pass', type: 'string' }
        ]
      });
    });

    it('should map grant types (password -> password_credentials, authorization_code without pkce)', () => {
      const passwordResult = brunoToPostman(makeRequestWithAuth({
        mode: 'oauth2',
        oauth2: { grantType: 'password' }
      }));
      expect(passwordResult.item[0].request.auth.oauth2).toContainEqual({
        key: 'grant_type', value: 'password_credentials', type: 'string'
      });

      const authCodeResult = brunoToPostman(makeRequestWithAuth({
        mode: 'oauth2',
        oauth2: { grantType: 'authorization_code', pkce: false }
      }));
      expect(authCodeResult.item[0].request.auth.oauth2).toContainEqual({
        key: 'grant_type', value: 'authorization_code', type: 'string'
      });
    });

    it('should default unknown grant type to client_credentials and map url token placement to queryParams', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'oauth2',
        oauth2: { tokenPlacement: 'url' }
      }));
      const oauth2 = result.item[0].request.auth.oauth2;
      expect(oauth2).toContainEqual({ key: 'grant_type', value: 'client_credentials', type: 'string' });
      expect(oauth2).toContainEqual({ key: 'addTokenTo', value: 'queryParams', type: 'string' });
    });

    it('should filter out empty/null/undefined values from oauth2 params', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'oauth2',
        oauth2: {
          grantType: 'client_credentials',
          clientId: 'client-id',
          clientSecret: '',
          scope: null,
          state: undefined
        }
      }));
      const keys = result.item[0].request.auth.oauth2.map((p) => p.key);
      expect(keys).toContain('clientId');
      expect(keys).not.toContain('clientSecret');
      expect(keys).not.toContain('scope');
      expect(keys).not.toContain('state');
    });

    it('should map additionalParameters to request-params with send_as translation', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'oauth2',
        oauth2: {
          grantType: 'authorization_code',
          additionalParameters: {
            authorization: [{ name: 'a', value: 'av', enabled: true, sendIn: 'headers' }],
            token: [{ name: 't', value: 'tv', enabled: false, sendIn: 'queryparams' }],
            refresh: [{ name: 'r', value: 'rv', enabled: true, sendIn: 'body' }]
          }
        }
      }));
      const oauth2 = result.item[0].request.auth.oauth2;
      expect(oauth2).toContainEqual({
        key: 'authRequestParams',
        value: [{ key: 'a', value: 'av', enabled: true, send_as: 'request_header' }],
        type: 'any'
      });
      expect(oauth2).toContainEqual({
        key: 'tokenRequestParams',
        value: [{ key: 't', value: 'tv', enabled: false, send_as: 'request_url' }],
        type: 'any'
      });
      expect(oauth2).toContainEqual({
        key: 'refreshRequestParams',
        value: [{ key: 'r', value: 'rv', enabled: true, send_as: 'request_body' }],
        type: 'any'
      });
    });

    it('should not emit request-params keys when additionalParameters are absent', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'oauth2',
        oauth2: { grantType: 'client_credentials' }
      }));
      const keys = result.item[0].request.auth.oauth2.map((p) => p.key);
      expect(keys).not.toContain('authRequestParams');
      expect(keys).not.toContain('tokenRequestParams');
      expect(keys).not.toContain('refreshRequestParams');
    });
  });

  describe('apikey', () => {
    it('should map queryparams placement to in: query', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'apikey',
        apikey: { key: 'X-API-Key', value: 'secret', placement: 'queryparams' }
      }));
      expect(result.item[0].request.auth).toEqual({
        type: 'apikey',
        apikey: [
          { key: 'key', value: 'X-API-Key', type: 'string' },
          { key: 'value', value: 'secret', type: 'string' },
          { key: 'in', value: 'query', type: 'string' }
        ]
      });
    });

    it('should map header placement to in: header', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'apikey',
        apikey: { key: 'X-API-Key', value: 'secret', placement: 'header' }
      }));
      expect(result.item[0].request.auth.apikey).toContainEqual({ key: 'in', value: 'header', type: 'string' });
    });

    it('should default to in: header when placement is missing', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'apikey',
        apikey: { key: 'X-API-Key', value: 'secret' }
      }));
      expect(result.item[0].request.auth.apikey).toContainEqual({ key: 'in', value: 'header', type: 'string' });
    });

    it('should handle missing key/value in apikey auth', () => {
      const result = brunoToPostman(makeRequestWithAuth({
        mode: 'apikey',
        apikey: { key: null, value: undefined }
      }));
      expect(result.item[0].request.auth).toEqual({
        type: 'apikey',
        apikey: [
          { key: 'key', value: '', type: 'string' },
          { key: 'value', value: '', type: 'string' },
          { key: 'in', value: 'header', type: 'string' }
        ]
      });
    });
  });

  describe('default / noauth', () => {
    it('should return noauth for a request with an unknown/none auth mode', () => {
      const result = brunoToPostman(makeRequestWithAuth({ mode: 'none' }));
      expect(result.item[0].request.auth).toEqual({ type: 'noauth' });
    });
  });

  describe('collection-level auth', () => {
    it('should export collection-level auth from root.request.auth', () => {
      const collection = {
        root: {
          request: {
            auth: { mode: 'bearer', bearer: { token: 'collection-token' } }
          }
        },
        items: []
      };
      const result = brunoToPostman(collection);
      expect(result.auth).toEqual({
        type: 'bearer',
        bearer: [
          { key: 'token', value: 'collection-token', type: 'string' }
        ]
      });
    });

    it('should leave collection auth undefined (not noauth) when the collection has no auth', () => {
      const collection = { items: [] };
      const result = brunoToPostman(collection);
      expect(result.auth).toBeUndefined();
    });

    it('should leave collection auth undefined for inherit mode', () => {
      const collection = {
        root: { request: { auth: { mode: 'inherit' } } },
        items: []
      };
      const result = brunoToPostman(collection);
      expect(result.auth).toBeUndefined();
    });
  });
});

describe('brunoToPostman multipartForm handling', () => {
  it('should export file type with type: file and src field', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'myFile',
                  value: ['/path/to/file1.txt', '/path/to/file2.txt'],
                  type: 'file',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'formdata',
      formdata: [
        {
          description: '',
          key: 'myFile',
          src: ['/path/to/file1.txt', '/path/to/file2.txt'],
          disabled: false,
          type: 'file'
        }
      ]
    });
  });

  it('should export text type with type: text and value field', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'myField',
                  value: 'some text value',
                  type: 'text',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'formdata',
      formdata: [
        {
          description: '',
          key: 'myField',
          value: 'some text value',
          disabled: false,
          type: 'text'
        }
      ]
    });
  });

  it('should export contentType when specified', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'myFile',
                  value: ['/path/to/file.json'],
                  type: 'file',
                  contentType: 'application/json',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'formdata',
      formdata: [
        {
          description: '',
          key: 'myFile',
          src: '/path/to/file.json',
          disabled: false,
          type: 'file',
          contentType: 'application/json'
        }
      ]
    });
  });

  it('should handle mixed file and text fields', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'textField',
                  value: 'hello',
                  type: 'text',
                  enabled: true
                },
                {
                  name: 'fileField',
                  value: ['/path/to/file.txt'],
                  type: 'file',
                  enabled: false
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'formdata',
      formdata: [
        {
          description: '',
          key: 'textField',
          value: 'hello',
          disabled: false,
          type: 'text'
        },
        {
          description: '',
          key: 'fileField',
          src: '/path/to/file.txt',
          disabled: true,
          type: 'file'
        }
      ]
    });
  });

  it('should handle file type with string value (not array)', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'myFile',
                  value: '/single/file/path.txt',
                  type: 'file',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body.formdata[0]).toEqual({
      description: '',
      key: 'myFile',
      src: '/single/file/path.txt',
      disabled: false,
      type: 'file'
    });
  });

  it('should handle file type with empty value', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'myFile',
                  value: '',
                  type: 'file',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body.formdata[0]).toEqual({
      description: '',
      key: 'myFile',
      src: null,
      disabled: false,
      type: 'file'
    });
  });
});

describe('brunoToPostman protocolProfileBehavior handling', () => {
  it('should add disableBodyPruning for GET requests with body', () => {
    const simpleCollection = {
      items: [
        {
          name: 'GET with body',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'file',
                  value: '/path/to/file.txt',
                  type: 'file',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].protocolProfileBehavior).toEqual({
      disableBodyPruning: true
    });
  });

  it('should not add protocolProfileBehavior for POST requests with body', () => {
    const simpleCollection = {
      items: [
        {
          name: 'POST with body',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'file',
                  value: '/path/to/file.txt',
                  type: 'file',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].protocolProfileBehavior).toBeUndefined();
  });

  it('should not add protocolProfileBehavior for GET requests without body', () => {
    const simpleCollection = {
      items: [
        {
          name: 'GET without body',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com'
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].protocolProfileBehavior).toBeUndefined();
  });

  it('should add disableBodyPruning for HEAD requests with body', () => {
    const simpleCollection = {
      items: [
        {
          name: 'HEAD with body',
          type: 'http-request',
          request: {
            method: 'HEAD',
            url: 'https://example.com',
            body: {
              mode: 'json',
              json: '{"test": true}'
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].protocolProfileBehavior).toEqual({
      disableBodyPruning: true
    });
  });
});

describe('brunoToPostman event handling', () => {
  it('should generate events for request scripts (req/res)', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            script: {
              req: 'console.log("pre");',
              res: 'console.log("post");'
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    const events = result.item[0].event;

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ listen: 'prerequest', script: { exec: ['console.log("pre");'] } });
    expect(events[1]).toMatchObject({ listen: 'test', script: { exec: ['console.log("post");'] } });
  });

  it('should generate events for folder scripts', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: 'Test Folder',
          script: {
            req: 'console.log("folder pre");',
            res: 'console.log("folder post");'
          },
          items: []
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    const folder = result.item[0];

    expect(folder.name).toBe('Test Folder');
    expect(folder.event).toHaveLength(2);
    expect(folder.event[0].listen).toBe('prerequest');
    expect(folder.event[1].listen).toBe('test');
  });

  it('should generate collection-level events from root', () => {
    const simpleCollection = {
      root: {
        script: {
          req: 'console.log("collection pre");',
          res: 'console.log("collection post");'
        }
      },
      items: []
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.event).toHaveLength(2);
    expect(result.event[0].listen).toBe('prerequest');
    expect(result.event[1].listen).toBe('test');
  });

  it('should handle nested folders and requests with scripts', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: 'Parent Folder',
          items: [
            {
              type: 'http-request',
              name: 'Nested Request',
              request: {
                method: 'GET',
                url: 'https://example.com',
                script: { req: 'console.log("nested pre");' }
              }
            }
          ]
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    const folder = result.item[0];
    const nestedRequest = folder.item[0];

    expect(folder.name).toBe('Parent Folder');
    expect(nestedRequest.name).toBe('Nested Request');
    expect(nestedRequest.event).toHaveLength(1);
    expect(nestedRequest.event[0].listen).toBe('prerequest');
    expect(nestedRequest.event[0].script.exec).toEqual(['console.log("nested pre");']);
  });
});

describe('brunoToPostman item ordering', () => {
  const makeRequest = (name, seq) => ({
    type: 'http-request',
    name,
    seq,
    request: {
      method: 'GET',
      url: 'https://example.com',
      headers: [],
      params: [],
      body: { mode: 'none' },
      auth: { mode: 'none' }
    }
  });

  const makeFolder = (name, seq, items = []) => ({
    type: 'folder',
    name,
    seq,
    items
  });

  it('should place folders before requests in export output', () => {
    const collection = {
      items: [
        makeRequest('Request A', 1),
        makeFolder('Folder B'),
        makeRequest('Request C', 2),
        makeFolder('Folder A')
      ]
    };

    const result = brunoToPostman(collection);
    const names = result.item.map((i) => i.name);

    // Folders first (alphabetical since no seq), then requests (by seq)
    expect(names[0]).toBe('Folder A');
    expect(names[1]).toBe('Folder B');
    expect(names[2]).toBe('Request A');
    expect(names[3]).toBe('Request C');
  });

  it('should sort requests by seq ascending', () => {
    const collection = {
      items: [
        makeRequest('Third', 3),
        makeRequest('First', 1),
        makeRequest('Second', 2)
      ]
    };

    const result = brunoToPostman(collection);
    const names = result.item.map((i) => i.name);

    expect(names).toEqual(['First', 'Second', 'Third']);
  });

  it('should sort folders by name then sequence', () => {
    const collection = {
      items: [
        makeFolder('Gamma', undefined),
        makeFolder('Alpha', undefined),
        makeFolder('Beta', 1)
      ]
    };

    const result = brunoToPostman(collection);
    const names = result.item.map((i) => i.name);

    // Beta has seq=1, so it goes to position 0; Alpha and Gamma are alphabetical
    expect(names[0]).toBe('Beta');
    expect(names[1]).toBe('Alpha');
    expect(names[2]).toBe('Gamma');
  });

  it('should sort items recursively within nested folders', () => {
    const collection = {
      items: [
        makeFolder('Parent', 1, [
          makeRequest('Nested C', 3),
          makeFolder('Nested Folder', 1),
          makeRequest('Nested A', 1)
        ])
      ]
    };

    const result = brunoToPostman(collection);
    const parent = result.item[0];
    const nestedNames = parent.item.map((i) => i.name);

    // Folder first, then requests sorted by seq
    expect(nestedNames).toEqual(['Nested Folder', 'Nested A', 'Nested C']);
  });

  it('should handle folders without seq (older collections) alphabetically', () => {
    const collection = {
      items: [
        makeFolder('Zebra', undefined),
        makeFolder('Apple', undefined),
        makeFolder('Mango', undefined)
      ]
    };

    const result = brunoToPostman(collection);
    const names = result.item.map((i) => i.name);

    expect(names).toEqual(['Apple', 'Mango', 'Zebra']);
  });
});
