import { getAuthHeaders } from 'utils/codegenerator/auth';

jest.mock('httpsnippet', () => {
  return {
    HTTPSnippet: jest.fn().mockImplementation((harRequest) => ({
      convert: jest.fn(() => {
        const method = harRequest?.method || 'GET';
        const url = harRequest?.url || 'http://example.com';
        const hasBody = harRequest?.postData?.text;

        if (method === 'POST' && hasBody) {
          return `curl -X POST ${url} -H "Content-Type: application/json" -d '${hasBody}'`;
        }
        return `curl -X ${method} ${url}`;
      })
    }))
  };
});

jest.mock('utils/codegenerator/har', () => ({
  buildHarRequest: jest.fn((data) => {
    const request = data.request || {};
    const method = request.method || 'GET';
    const url = request.url || 'http://example.com';
    const body = request.body || {};

    const harRequest = {
      method: method,
      url: url,
      headers: data.headers || [],
      httpVersion: 'HTTP/1.1'
    };

    // Add body data for POST requests
    if (method === 'POST' && body.mode === 'json' && body.json) {
      harRequest.postData = {
        mimeType: 'application/json',
        text: body.json
      };
    }

    return harRequest;
  })
}));

jest.mock('utils/codegenerator/auth', () => ({
  getAuthHeaders: jest.fn(() => [])
}));

jest.mock('utils/collections/index', () => {
  const actual = jest.requireActual('utils/collections/index');

  return {
    ...actual,
    getAllVariables: jest.fn((collection) => ({
      ...collection?.globalEnvironmentVariables,
      ...collection?.runtimeVariables,
      ...collection?.processEnvVariables,
      baseUrl: 'https://api.example.com',
      apiKey: 'secret-key-123',
      userId: '12345',
      user: 'admin',
      pass: 'secret123'
    })),
    getTreePathFromCollectionToItem: jest.fn(() => [])
  };
});

import { generateSnippet } from './snippet-generator';

describe('Snippet Generator - Simple Tests', () => {
  // Simple test request - easy to understand
  const testRequest = {
    uid: 'test-request-123',
    name: 'test api call',
    type: 'http-request',
    request: {
      method: 'POST',
      url: 'https://api.example.com/{{endpoint}}',
      headers: [
        { uid: 'h1', name: 'Authorization', value: 'Bearer {{apiToken}}', enabled: true },
        { uid: 'h2', name: 'Content-Type', value: 'application/json', enabled: true },
        { uid: 'h3', name: 'X-Custom', value: '{{customValue}}', enabled: true }
      ],
      body: {
        mode: 'json',
        json: '{"message": "{{greeting}}", "count": {{number}}}'
      },
      auth: { mode: 'none' },
      assertions: [],
      tests: '',
      docs: '',
      params: [],
      vars: { req: [] }
    }
  };

  const testCollection = {
    root: {
      request: {
        auth: { mode: 'none' },
        headers: []
      }
    },
    globalEnvironmentVariables: {
      endpoint: 'data',
      apiToken: 'token123',
      customValue: 'test-value',
      greeting: 'Hello World',
      number: 42
    },
    runtimeVariables: {},
    processEnvVariables: {}
  };

  const curlLanguage = { target: 'shell', client: 'curl' };

  beforeEach(() => {
    jest.clearAllMocks();
    require('httpsnippet').HTTPSnippet = jest.fn().mockImplementation((harRequest) => ({
      convert: jest.fn(() => {
        const method = harRequest?.method || 'GET';
        const url = harRequest?.url || 'http://example.com';
        const hasBody = harRequest?.postData?.text;

        if (method === 'POST' && hasBody) {
          return `curl -X POST ${url} -H "Content-Type: application/json" -d '${hasBody}'`;
        }
        return `curl -X ${method} ${url}`;
      })
    }));
  });

  it('should generate curl for POST request with JSON body', () => {
    const result = generateSnippet({
      language: curlLanguage,
      item: testRequest,
      collection: testCollection,
      shouldInterpolate: false
    });

    expect(result).toBe('curl -X POST https://api.example.com/{{endpoint}} -H "Content-Type: application/json" -d \'{"message": "{{greeting}}", "count": {{number}}}\'');
  });

  it('should interpolate variables when enabled', () => {
    const result = generateSnippet({
      language: curlLanguage,
      item: testRequest,
      collection: testCollection,
      shouldInterpolate: true
    });

    const expectedBody = `{
  "message": "Hello World",
  "count": 42
}`;
    expect(result).toBe(`curl -X POST https://api.example.com/{{endpoint}} -H "Content-Type: application/json" -d '${expectedBody}'`);
  });

  it('should handle GET requests', () => {
    const getRequest = {
      ...testRequest,
      request: {
        ...testRequest.request,
        method: 'GET',
        body: { mode: 'none' }
      }
    };

    const result = generateSnippet({
      language: curlLanguage,
      item: getRequest,
      collection: testCollection,
      shouldInterpolate: false
    });

    expect(result).toBe('curl -X GET https://api.example.com/{{endpoint}}');
  });

  it('should handle requests with different headers', () => {
    const requestWithDifferentHeaders = {
      ...testRequest,
      request: {
        ...testRequest.request,
        headers: [
          { uid: 'h1', name: 'X-API-Key', value: '{{apiKey}}', enabled: true },
          { uid: 'h2', name: 'Accept', value: 'application/json', enabled: true },
          { uid: 'h3', name: 'User-Agent', value: 'TestApp/{{version}}', enabled: true }
        ]
      }
    };

    const collectionWithDifferentVars = {
      ...testCollection,
      globalEnvironmentVariables: {
        ...testCollection.globalEnvironmentVariables,
        apiKey: 'secret-key-456',
        version: '1.0.0'
      }
    };

    const result = generateSnippet({
      language: curlLanguage,
      item: requestWithDifferentHeaders,
      collection: collectionWithDifferentVars,
      shouldInterpolate: true
    });

    // Body should have interpolated variables with proper formatting
    const expectedBody = `{
  "message": "Hello World",
  "count": 42
}`;
    expect(result).toBe(`curl -X POST https://api.example.com/{{endpoint}} -H "Content-Type: application/json" -d '${expectedBody}'`);
  });

  it('should handle complex nested JSON body', () => {
    const complexBody = {
      user: {
        name: '{{userName}}',
        settings: {
          theme: '{{userTheme}}',
          active: true
        }
      },
      data: {
        items: ['{{item1}}', '{{item2}}'],
        total: '{{totalCount}}'
      }
    };

    const requestWithComplexBody = {
      ...testRequest,
      request: {
        ...testRequest.request,
        body: {
          mode: 'json',
          json: JSON.stringify(complexBody, null, 2)
        }
      }
    };

    const collectionWithComplexVars = {
      ...testCollection,
      globalEnvironmentVariables: {
        ...testCollection.globalEnvironmentVariables,
        userName: 'Alice',
        userTheme: 'dark',
        item1: 'first',
        item2: 'second',
        totalCount: 100
      }
    };

    const result = generateSnippet({
      language: curlLanguage,
      item: requestWithComplexBody,
      collection: collectionWithComplexVars,
      shouldInterpolate: true
    });

    const expectedComplexBody = JSON.stringify({
      user: {
        name: 'Alice',
        settings: {
          theme: 'dark',
          active: true
        }
      },
      data: {
        items: ['first', 'second'],
        total: '100'
      }
    }, null, 2);

    expect(result).toBe(`curl -X POST https://api.example.com/{{endpoint}} -H "Content-Type: application/json" -d '${expectedComplexBody}'`);
  });

  it('should handle errors gracefully', () => {
    // Set up the error mock after beforeEach has run
    const originalHTTPSnippet = require('httpsnippet').HTTPSnippet;
    require('httpsnippet').HTTPSnippet = jest.fn(() => {
      throw new Error('Mock error!');
    });

    const originalConsoleError = console.error;
    console.error = jest.fn();

    const result = generateSnippet({
      language: curlLanguage,
      item: testRequest,
      collection: testCollection,
      shouldInterpolate: false
    });

    expect(result).toBe('Error generating code snippet');

    require('httpsnippet').HTTPSnippet = originalHTTPSnippet;
    console.error = originalConsoleError;
  });

  it('should work with JavaScript language', () => {
    const javascriptLanguage = { target: 'javascript', client: 'fetch' };

    const expectedJavaScriptCode = `fetch("https://api.example.com/data", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ "message": "Hello World", "count": 42 })
})`;

    const originalHTTPSnippet = require('httpsnippet').HTTPSnippet;
    require('httpsnippet').HTTPSnippet = jest.fn().mockImplementation(() => ({
      convert: jest.fn(() => expectedJavaScriptCode)
    }));

    const result = generateSnippet({
      language: javascriptLanguage,
      item: testRequest,
      collection: testCollection,
      shouldInterpolate: false
    });

    expect(result).toBe(expectedJavaScriptCode);

    // Restore the original mock
    require('httpsnippet').HTTPSnippet = originalHTTPSnippet;
  });

  it('should interpolate simple headers and body variables', () => {
    const simpleTestRequest = {
      uid: 'test-123',
      name: 'simple test',
      type: 'http-request',
      request: {
        method: 'POST',
        url: 'https://api.test.com/{{endpoint}}',
        headers: [
          { uid: 'h1', name: 'Authorization', value: 'Bearer {{token}}', enabled: true },
          { uid: 'h2', name: 'X-User-ID', value: '{{userId}}', enabled: true },
          { uid: 'h3', name: 'Content-Type', value: 'application/json', enabled: true }
        ],
        body: {
          mode: 'json',
          json: '{"name": "{{userName}}", "email": "{{userEmail}}", "age": {{userAge}}}'
        }
      }
    };

    // Simple collection with clear variable values
    const simpleTestCollection = {
      root: {
        request: {
          auth: { mode: 'none' },
          headers: []
        }
      },
      globalEnvironmentVariables: {
        endpoint: 'users',
        token: 'abc123token',
        userId: 'user456',
        userName: 'John Smith',
        userEmail: 'john@test.com',
        userAge: 30
      },
      runtimeVariables: {},
      processEnvVariables: {}
    };

    const result = generateSnippet({
      language: curlLanguage,
      item: simpleTestRequest,
      collection: simpleTestCollection,
      shouldInterpolate: true
    });

    const expectedInterpolatedBody = `{
  "name": "John Smith",
  "email": "john@test.com",
  "age": 30
}`;

    expect(result).toBe(`curl -X POST https://api.test.com/{{endpoint}} -H "Content-Type: application/json" -d '${expectedInterpolatedBody}'`);
  });

  it('should NOT interpolate when shouldInterpolate is false', () => {
    const simpleTestRequest = {
      uid: 'test-123',
      name: 'simple test',
      type: 'http-request',
      request: {
        method: 'POST',
        url: 'https://api.test.com/{{endpoint}}',
        headers: [
          { uid: 'h1', name: 'Authorization', value: 'Bearer {{token}}', enabled: true },
          { uid: 'h2', name: 'X-User-ID', value: '{{userId}}', enabled: true },
          { uid: 'h3', name: 'Content-Type', value: 'application/json', enabled: true }
        ],
        body: {
          mode: 'json',
          json: '{"name": "{{userName}}", "email": "{{userEmail}}", "age": {{userAge}}}'
        }
      }
    };

    const simpleTestCollection = {
      root: {
        request: {
          auth: { mode: 'none' },
          headers: []
        }
      },
      globalEnvironmentVariables: {
        endpoint: 'users',
        token: 'abc123token',
        userId: 'user456',
        userName: 'John Smith',
        userEmail: 'john@test.com',
        userAge: 30
      },
      runtimeVariables: {},
      processEnvVariables: {}
    };

    const result = generateSnippet({
      language: curlLanguage,
      item: simpleTestRequest,
      collection: simpleTestCollection,
      shouldInterpolate: false
    });

    expect(result).toBe('curl -X POST https://api.test.com/{{endpoint}} -H "Content-Type: application/json" -d \'{"name": "{{userName}}", "email": "{{userEmail}}", "age": {{userAge}}}\'');
  });

  it('should interpolate auth credentials correctly', () => {
    // Auth inheritance is resolved upstream in index.js before calling generateSnippet
    // So the item already has the resolved auth (not 'inherit' mode)
    const item = {
      request: {
        method: 'GET',
        url: 'https://api.example.com',
        auth: {
          mode: 'basic',
          basic: {
            username: '{{user}}',
            password: '{{pass}}'
          }
        }
      }
    };

    const collection = {
      root: {
        request: {
          auth: { mode: 'none' }
        }
      }
    };

    const { HTTPSnippet: mockedHTTPSnippet } = require('httpsnippet');
    const { getAuthHeaders: actualGetAuthHeaders } = jest.requireActual('utils/codegenerator/auth');
    getAuthHeaders.mockImplementation(actualGetAuthHeaders);

    const language = { target: 'shell', client: 'curl' };

    generateSnippet({
      language,
      item,
      collection,
      shouldInterpolate: true
    });

    const harRequest = mockedHTTPSnippet.mock.calls[0][0];

    // "admin:secret123" encoded is "YWRtaW46c2VjcmV0MTIz"
    expect(harRequest.headers).toContainEqual(
      expect.objectContaining({
        name: 'Authorization',
        value: 'Basic YWRtaW46c2VjcmV0MTIz'
      })
    );
  });
});

// Snippet should include inherited headers
describe('generateSnippet – header inclusion in output', () => {
  it('should include collection and folder headers in generated snippet', () => {
    const language = { target: 'shell', client: 'curl' };

    const collection = {
      root: {
        request: {
          headers: [
            { name: 'X-Collection', value: 'c', enabled: true }
          ],
          auth: { mode: 'none' }
        }
      }
    };

    const folder = {
      uid: 'f1',
      type: 'folder',
      root: {
        request: {
          headers: [
            { name: 'X-Folder', value: 'f', enabled: true }
          ]
        }
      }
    };

    const item = {
      uid: 'r1',
      request: {
        method: 'GET',
        url: 'https://example.com',
        headers: [],
        auth: { mode: 'none' }
      }
    };

    // Override tree path to include folder
    const utilsCollections = require('utils/collections/index');
    utilsCollections.getTreePathFromCollectionToItem.mockImplementation(() => [folder]);

    // Custom HTTPSnippet mock that outputs headers list
    const originalHTTPSnippet = require('httpsnippet').HTTPSnippet;
    require('httpsnippet').HTTPSnippet = jest.fn().mockImplementation((harRequest) => ({
      convert: jest.fn(() => `HEADERS:${harRequest.headers.map((h) => h.name).join(',')}`)
    }));

    const result = generateSnippet({ language, item, collection, shouldInterpolate: false });

    // Restore original mock
    require('httpsnippet').HTTPSnippet = originalHTTPSnippet;

    expect(result).toContain('X-Collection');
    expect(result).toContain('X-Folder');
  });
});

describe('generateSnippet with edge-case bodies', () => {
  const language = { target: 'shell', client: 'curl' };
  const baseCollection = { root: { request: { auth: { mode: 'none' }, headers: [] } } };

  it('should generate snippet for empty formUrlEncoded body when interpolation is disabled', () => {
    const item = {
      uid: 'req1',
      request: {
        method: 'POST',
        url: 'https://example.com',
        headers: [],
        body: { mode: 'formUrlEncoded', formUrlEncoded: [] },
        auth: { mode: 'none' }
      }
    };

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toMatch(/^curl -X POST/);
  });

  it('should generate snippet for empty multipartForm body when interpolation is disabled', () => {
    const item = {
      uid: 'req2',
      request: {
        method: 'POST',
        url: 'https://example.com',
        headers: [],
        body: { mode: 'multipartForm' },
        auth: { mode: 'none' }
      }
    };

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toMatch(/^curl -X POST/);
  });

  it('should generate snippet for undefined formUrlEncoded array with interpolation enabled', () => {
    const item = {
      uid: 'req3',
      request: {
        method: 'POST',
        url: 'https://example.com',
        headers: [],
        body: { mode: 'formUrlEncoded' },
        auth: { mode: 'none' }
      }
    };

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: true });
    expect(result).toMatch(/^curl -X POST/);
  });

  it('should generate snippet for empty multipartForm array with interpolation enabled', () => {
    const item = {
      uid: 'req4',
      request: {
        method: 'POST',
        url: 'https://example.com',
        headers: [],
        body: { mode: 'multipartForm', multipartForm: [] },
        auth: { mode: 'none' }
      }
    };

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: true });
    expect(result).toMatch(/^curl -X POST/);
  });
});

describe('generateSnippet with OAuth2 authentication', () => {
  const language = { target: 'shell', client: 'curl' };
  const baseCollection = { root: { request: { auth: { mode: 'none' }, headers: [] } } };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getAuthHeaders to return OAuth2 headers based on the auth config
    const authUtils = require('utils/codegenerator/auth');
    authUtils.getAuthHeaders.mockImplementation((requestAuth, collection = null, item = null) => {
      if (requestAuth?.mode === 'oauth2') {
        const oauth2Config = requestAuth.oauth2 || {};
        const tokenPlacement = oauth2Config.tokenPlacement || 'header';
        // Use the actual value from config, defaulting to 'Bearer' only if undefined
        // Empty string should be preserved to test no-prefix scenarios
        const tokenHeaderPrefix = oauth2Config.tokenHeaderPrefix !== undefined
          ? oauth2Config.tokenHeaderPrefix
          : 'Bearer';
        let accessToken = oauth2Config.accessToken || '<access_token>';

        // If collection and item are provided, try to look up stored credentials
        if (collection && item && collection.oauth2Credentials) {
          const grantType = oauth2Config.grantType || '';
          const urlToLookup = grantType === 'implicit'
            ? oauth2Config.authorizationUrl || ''
            : oauth2Config.accessTokenUrl || '';
          const credentialsId = oauth2Config.credentialsId || 'credentials';
          const collectionUid = collection.uid;

          if (urlToLookup && collectionUid) {
            // Look up stored credentials (simplified - assumes URL is already interpolated in test data)
            const credentialsData = collection.oauth2Credentials.find(
              (creds) =>
                creds?.url === urlToLookup
                && creds?.collectionUid === collectionUid
                && creds?.credentialsId === credentialsId
            );

            if (credentialsData?.credentials?.access_token) {
              accessToken = credentialsData.credentials.access_token;
            }
          }
        }

        if (tokenPlacement === 'header') {
          // Always trim the final result for consistent formatting
          const headerValue = tokenHeaderPrefix
            ? `${tokenHeaderPrefix} ${accessToken}`.trim()
            : accessToken.trim();
          return [
            {
              enabled: true,
              name: 'Authorization',
              value: headerValue
            }
          ];
        }
      }
      return [];
    });
  });

  it('should include OAuth2 Bearer token in Authorization header when tokenPlacement is header', () => {
    const item = {
      uid: 'oauth-req',
      request: {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: [],
        auth: {
          mode: 'oauth2',
          oauth2: {
            grantType: 'client_credentials',
            tokenPlacement: 'header',
            tokenHeaderPrefix: 'Bearer',
            accessToken: 'test-access-token-123'
          }
        }
      }
    };

    generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });

    const harUtils = require('utils/codegenerator/har');
    const harCall = harUtils.buildHarRequest.mock.calls[0][0];
    expect(harCall.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Authorization',
          value: 'Bearer test-access-token-123'
        })
      ])
    );
  });

  it('should use custom tokenHeaderPrefix when provided', () => {
    const item = {
      uid: 'oauth-req-custom',
      request: {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: [],
        auth: {
          mode: 'oauth2',
          oauth2: {
            grantType: 'client_credentials',
            tokenPlacement: 'header',
            tokenHeaderPrefix: 'OAuth',
            accessToken: 'custom-token-456'
          }
        }
      }
    };

    generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });

    const harUtils = require('utils/codegenerator/har');
    const harCall = harUtils.buildHarRequest.mock.calls[0][0];
    expect(harCall.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Authorization',
          value: 'OAuth custom-token-456'
        })
      ])
    );
  });

  it('should not include Authorization header when tokenPlacement is url', () => {
    const item = {
      uid: 'oauth-req-url',
      request: {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: [],
        auth: {
          mode: 'oauth2',
          oauth2: {
            grantType: 'client_credentials',
            tokenPlacement: 'url',
            tokenQueryKey: 'access_token',
            accessToken: 'token-in-url'
          }
        }
      }
    };

    generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });

    const harUtils = require('utils/codegenerator/har');
    const harCall = harUtils.buildHarRequest.mock.calls[0][0];
    const authHeader = harCall.headers.find((h) => h.name === 'Authorization');
    expect(authHeader).toBeUndefined();
  });

  it('should use placeholder when accessToken is not available', () => {
    const item = {
      uid: 'oauth-req-placeholder',
      request: {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: [],
        auth: {
          mode: 'oauth2',
          oauth2: {
            grantType: 'client_credentials',
            tokenPlacement: 'header',
            tokenHeaderPrefix: 'Bearer'
          }
        }
      }
    };

    generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });

    const harUtils = require('utils/codegenerator/har');
    const harCall = harUtils.buildHarRequest.mock.calls[0][0];
    expect(harCall.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Authorization',
          value: 'Bearer <access_token>'
        })
      ])
    );
  });

  it('should handle empty tokenHeaderPrefix', () => {
    const item = {
      uid: 'oauth-req-no-prefix',
      request: {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: [],
        auth: {
          mode: 'oauth2',
          oauth2: {
            grantType: 'client_credentials',
            tokenPlacement: 'header',
            tokenHeaderPrefix: '',
            accessToken: 'token-without-prefix'
          }
        }
      }
    };

    generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });

    const harUtils = require('utils/codegenerator/har');
    const harCall = harUtils.buildHarRequest.mock.calls[0][0];
    expect(harCall.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Authorization',
          value: 'token-without-prefix'
        })
      ])
    );
  });
});

describe('generateSnippet – digest and NTLM auth curl export', () => {
  const language = { target: 'shell', client: 'curl' };

  const baseCollection = {
    root: {
      request: {
        headers: [],
        auth: { mode: 'none' }
      }
    }
  };

  it('should add --digest flag and --user for digest auth', () => {
    const item = {
      uid: 'digest-req',
      request: {
        method: 'GET',
        url: 'https://example.com/api',
        headers: [],
        body: { mode: 'none' },
        auth: {
          mode: 'digest',
          digest: {
            username: 'myuser',
            password: 'mypass'
          }
        }
      }
    };

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toMatch(/^curl --digest --user 'myuser:mypass'/);
  });

  it('should add --ntlm flag and --user for NTLM auth', () => {
    const item = {
      uid: 'ntlm-req',
      request: {
        method: 'GET',
        url: 'https://example.com/api',
        headers: [],
        body: { mode: 'none' },
        auth: {
          mode: 'ntlm',
          ntlm: {
            username: 'myuser',
            password: 'mypass'
          }
        }
      }
    };

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toMatch(/^curl --ntlm --user 'myuser:mypass'/);
  });

  it('should handle digest auth with username only (no password)', () => {
    const item = {
      uid: 'digest-no-pass',
      request: {
        method: 'GET',
        url: 'https://example.com/api',
        headers: [],
        body: { mode: 'none' },
        auth: {
          mode: 'digest',
          digest: {
            username: 'myuser',
            password: ''
          }
        }
      }
    };

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toMatch(/^curl --digest --user 'myuser'/);
  });
});
