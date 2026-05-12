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

describe('generateSnippet – encodeUrl setting', () => {
  const language = { target: 'shell', client: 'curl' };
  const baseCollection = { root: { request: { auth: { mode: 'none' }, headers: [] } } };

  // Replicate HTTPSnippet's internal encoding to get encoded path+query
  const getEncodedPath = (url) => {
    const { parse } = require('url');
    const { stringify } = require('query-string');
    const parsed = parse(url, true, true);
    if (!parsed.query || Object.keys(parsed.query).length === 0) {
      return parsed.pathname;
    }
    const search = stringify(parsed.query, { sort: false });
    return search ? `${parsed.pathname}?${search}` : parsed.pathname;
  };

  const makeItem = (url, settings, draft) => ({
    uid: 'enc-req',
    request: {
      method: 'GET',
      url,
      headers: [],
      body: { mode: 'none' },
      auth: { mode: 'none' }
    },
    ...(settings !== undefined && { settings }),
    ...(draft !== undefined && { draft })
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock HTTPSnippet to simulate encoding (same pipeline as the real library)
    require('httpsnippet').HTTPSnippet = jest.fn().mockImplementation((harRequest) => ({
      convert: jest.fn((target) => {
        const method = harRequest?.method || 'GET';
        const url = harRequest?.url || 'http://example.com';
        const { parse } = require('url');
        const parsed = parse(url, false, true);
        const encodedPath = getEncodedPath(url);
        // Simulate targets that use only the path (e.g., python http.client, raw HTTP)
        if (target === 'python') {
          return `conn.request("${method}", "${encodedPath}", headers=headers)`;
        }
        // Full URL targets: reconstruct with encoded path
        const fullEncodedUrl = `${parsed.protocol}//${parsed.host}${encodedPath}`;
        return `curl -X ${method} '${fullEncodedUrl}'`;
      })
    }));
  });

  it('should preserve equals signs in query values when encodeUrl is false', () => {
    const rawUrl = 'https://example.com/api?token=abc123==&type=test';
    const item = makeItem(rawUrl, { encodeUrl: false });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('token=abc123==');
    // %3D = encoded '='
    expect(result).not.toContain('%3D');
  });

  it('should preserve email with plus alias and @ when encodeUrl is false', () => {
    const rawUrl = 'https://example.com/invite?email=test+alias@example.com';
    const item = makeItem(rawUrl, { encodeUrl: false });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('email=test+alias@example.com');
  });

  it('should preserve redirect URL with colons and slashes when encodeUrl is false', () => {
    const rawUrl = 'https://example.com/auth?redirect=https://other.com/callback&scope=read';
    const item = makeItem(rawUrl, { encodeUrl: false });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('redirect=https://other.com/callback');
    // %3A = encoded ':'
    expect(result).not.toContain('%3A');
    // %2F = encoded '/'
    expect(result).not.toContain('%2F');
  });

  it('should preserve comma-separated values when encodeUrl is false', () => {
    const rawUrl = 'https://example.com/filter?tags=a,b,c&time=10:30';
    const item = makeItem(rawUrl, { encodeUrl: false });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('tags=a,b,c');
    expect(result).toContain('time=10:30');
  });

  it('should encode URL when encodeUrl is true', () => {
    const rawUrl = 'https://example.com/api?token=abc123==&type=test';
    const item = makeItem(rawUrl, { encodeUrl: true });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    // %3D%3D = encoded '=='
    expect(result).toContain('%3D%3D');
  });

  it('should preserve raw URL when settings are absent (encodeUrl defaults to false)', () => {
    const rawUrl = 'https://example.com/auth?redirect=https://other.com/callback';
    const item = makeItem(rawUrl);

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('redirect=https://other.com/callback');
    // %3A = encoded ':'
    expect(result).not.toContain('%3A');
  });

  it('should be a no-op for URLs without query params and no encoding needed', () => {
    const rawUrl = 'https://example.com/api/users';
    const item = makeItem(rawUrl, { encodeUrl: false });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toBe(`curl -X GET '${rawUrl}'`);
  });

  it('should preserve spaces in pathname when encodeUrl is false and rawUrl is provided', () => {
    const encodedUrl = 'https://example.com/my%20path/hello%20world?token=abc123==';
    const item = {
      ...makeItem(encodedUrl, { encodeUrl: false }),
      rawUrl: 'https://example.com/my path/hello world?token=abc123=='
    };

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('/my path/hello world?token=abc123==');
    expect(result).not.toContain('%20');
    expect(result).not.toContain('%3D');
  });

  it('should preserve spaces in pathname without query params when encodeUrl is false', () => {
    const encodedUrl = 'https://example.com/my%20path/hello%20world';
    const item = {
      ...makeItem(encodedUrl, { encodeUrl: false }),
      rawUrl: 'https://example.com/my path/hello world'
    };

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('/my path/hello world');
    expect(result).not.toContain('%20');
  });

  it('should preserve spaces in path-only targets (e.g., python) when encodeUrl is false', () => {
    const pythonLanguage = { target: 'python', client: 'python3' };
    const encodedUrl = 'https://example.com/my%20path/hello%20world?q=test';
    const item = {
      ...makeItem(encodedUrl, { encodeUrl: false }),
      rawUrl: 'https://example.com/my path/hello world?q=test'
    };

    const result = generateSnippet({ language: pythonLanguage, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('/my path/hello world?q=test');
    expect(result).not.toContain('%20');
  });

  it('should preserve spaces in query values when encodeUrl is false and rawUrl is provided', () => {
    const encodedUrl = 'https://example.com/api?token=abc%20123==&type=test';
    const item = {
      ...makeItem(encodedUrl, { encodeUrl: false }),
      rawUrl: 'https://example.com/api?token=abc 123==&type=test'
    };

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('token=abc 123==');
    expect(result).not.toContain('%20');
    expect(result).not.toContain('%3D');
  });

  it('should still work when rawUrl is not provided (backward compatibility)', () => {
    const rawUrl = 'https://example.com/api?token=abc123==&type=test';
    const item = makeItem(rawUrl, { encodeUrl: false });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('token=abc123==');
    expect(result).not.toContain('%3D');
  });

  it('should keep spaces as %20 for http target when encodeUrl is false (HTTP spec compliance)', () => {
    const httpLanguage = { target: 'http', client: 'http1.1' };
    const encodedUrl = 'https://example.com/api?token=abc%20123==&type=test';
    const item = {
      ...makeItem(encodedUrl, { encodeUrl: false }),
      rawUrl: 'https://example.com/api?token=abc 123==&type=test'
    };
    const result = generateSnippet({ language: httpLanguage, item, collection: baseCollection, shouldInterpolate: false });
    // Spaces must remain encoded for valid HTTP request line
    expect(result).toContain('%20');
    // But other chars like = should still be decoded
    expect(result).not.toContain('%3D');
  });

  it('should preserve user-typed %20 when encodeUrl is false (not decode to space)', () => {
    const preEncodedUrl = 'https://example.com/api?token=abc%20123%3D%3D&type=test';
    const item = {
      ...makeItem(preEncodedUrl, { encodeUrl: false }),
      rawUrl: preEncodedUrl // rawUrl has %20 intact (no decodeURI applied)
    };
    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    // %20 should be preserved, not decoded to a literal space
    expect(result).toContain('%20');
    // %3D should also be preserved
    expect(result).toContain('%3D%3D');
    // No double-encoding
    expect(result).not.toContain('%2520');
    expect(result).not.toContain('%253D');
  });

  it('should NOT double-encode pre-encoded %20 when encodeUrl is true (idempotent)', () => {
    const preEncodedUrl = 'https://example.com/api?token=abc%20123%3D%3D&type=test';
    const item = {
      ...makeItem(preEncodedUrl, { encodeUrl: true }),
      rawUrl: preEncodedUrl
    };
    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    // %20 must stay %20 — encoder decodes then re-encodes, so already-encoded input round-trips
    expect(result).toContain('%20');
    expect(result).not.toContain('%2520');
    // %3D must stay %3D for the same reason
    expect(result).toContain('%3D');
    expect(result).not.toContain('%253D');
  });

  it('should preserve OData-style paths with parenthesized params when encodeUrl is false', () => {
    const rawUrl = 'https://example.com/odata/Products(123)/Categories(456)?$expand=Items&$filter=Price gt 10';
    const item = {
      ...makeItem(rawUrl, { encodeUrl: false }),
      rawUrl
    };
    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('Products(123)/Categories(456)');
    expect(result).toContain('$expand=Items');
    expect(result).toContain('$filter=Price gt 10');
    // $ should not be encoded
    expect(result).not.toContain('%24');
  });

  it('should use draft settings when draft exists', () => {
    const rawUrl = 'https://example.com/api?token=abc123==&type=test';
    const item = makeItem(rawUrl, { encodeUrl: true }, { settings: { encodeUrl: false } });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('token=abc123==');
    // %3D%3D = encoded '=='
    expect(result).not.toContain('%3D%3D');
  });

  it('should replace encoded path for targets that use only path+query (e.g., python http.client)', () => {
    const pythonLanguage = { target: 'python', client: 'python3' };
    const rawUrl = 'https://example.com/api?token=abc123==&type=test';
    const item = makeItem(rawUrl, { encodeUrl: false });

    const result = generateSnippet({ language: pythonLanguage, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('/api?token=abc123==&type=test');
    // %3D = encoded '='
    expect(result).not.toContain('%3D');
  });

  it('should preserve URL fragment (#) in snippet when encodeUrl is false', () => {
    // Intentional asymmetry: when encodeUrl is false (raw mode), generateSnippet preserves the
    // user-supplied URL as-is, including any fragment. This contrasts with encodeUrl: true,
    // which strips fragments per RFC 3986 §3.5. The rawUrl is preserved through the makeItem
    // call with { encodeUrl: false } and passed to generateSnippet, which intentionally treats
    // it as a user-specified string not subject to RFC-compliant stripping. This is a designed
    // behavior to honor user intent in raw mode, not a bug. This behavior can be revisited in
    // the future if requirements or RFC interpretations change.
    const rawUrl = 'https://example.com/api?token=abc==#section';
    const item = makeItem(rawUrl, { encodeUrl: false });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toContain('#section');
    expect(result).toContain('token=abc==');
    expect(result).not.toContain('%3D');
  });

  it('should not include URL fragment (#) in snippet when encodeUrl is true', () => {
    const rawUrl = 'https://example.com/api?token=abc==#section';
    const item = makeItem(rawUrl, { encodeUrl: true });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    // Fragment is stripped — correct per RFC 3986 §3.5: user agents MUST NOT include the fragment
    // in the HTTP request target sent to the origin server (though fragments can still appear in
    // user-facing URLs, SPA routing, and are inherited across redirects per RFC 9110 §10.2.2).
    // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5
    // https://datatracker.ietf.org/doc/html/rfc9110#section-10.2.2
    expect(result).not.toContain('#section');
    expect(result).toContain('%3D%3D');
  });

  it('should single-encode spaces and special chars when encodeUrl is true and rawUrl is provided', () => {
    // The raw URL (before new URL() encoding) contains literal spaces and @.
    // encodeUrl() should encode them once: space → %20, @ → %40.
    // Previously this double-encoded because request.url was already encoded by new URL().
    const encodedUrl = 'https://example.com/api?name=abc%20os&email=user%40test.com';
    const item = {
      ...makeItem(encodedUrl, { encodeUrl: true }),
      rawUrl: 'https://example.com/api?name=abc os&email=user@test.com'
    };

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    // space → %20 (single encoding, not %2520)
    expect(result).toContain('%20');
    expect(result).not.toContain('%2520');
    // @ → %40 (single encoding, not %2540)
    expect(result).toContain('%40');
    expect(result).not.toContain('%2540');
  });

  it('should encode special chars in query values when encodeUrl is true (e.g., redirect URLs)', () => {
    const rawUrl = 'https://example.com/auth?redirect=https://other.com/callback&scope=read';
    const item = makeItem(rawUrl, { encodeUrl: true });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    // : → %3A, / → %2F when encodeURIComponent is applied to query values
    expect(result).toContain('%3A');
    expect(result).toContain('%2F');
  });

  it('should strip fragment and apply encodeUrl when both are present and encodeUrl is true', () => {
    const rawUrl = 'https://example.com/api?redirect=https://other.com/cb#section';
    const item = makeItem(rawUrl, { encodeUrl: true });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    // Fragment stripped per RFC 3986
    expect(result).not.toContain('#section');
    // Query value should be encoded
    expect(result).toContain('%3A');
    expect(result).toContain('%2F');
  });

  it('should be a no-op for path-only URLs when encodeUrl is true (no query params to encode)', () => {
    const rawUrl = 'https://example.com/api/users';
    const item = makeItem(rawUrl, { encodeUrl: true });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toBe(`curl -X GET '${rawUrl}'`);
  });

  it('should preserve raw URL with multiple query params in non-alphabetical order when encodeUrl is false', () => {
    const rawUrl = 'https://example.com/api?start=2026-02-01T00:00:00.000Z&a=b';
    const item = makeItem(rawUrl, { encodeUrl: false });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toBe(`curl -X GET '${rawUrl}'`);
  });

  it('should encode URL with multiple query params in non-alphabetical order when encodeUrl is true', () => {
    const rawUrl = 'https://example.com/api?start=2026-02-01T00:00:00.000Z&a=b';
    const item = makeItem(rawUrl, { encodeUrl: true });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toBe('curl -X GET \'https://example.com/api?start=2026-02-01T00%3A00%3A00.000Z&a=b\'');
  });

  it('should preserve param order in raw URL when encodeUrl is false and params are reverse-alphabetical', () => {
    const rawUrl = 'https://example.com/api?z=last&a=first&m=middle';
    const item = makeItem(rawUrl, { encodeUrl: false });

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
    expect(result).toBe(`curl -X GET '${rawUrl}'`);
  });
});

describe('generateSnippet – templated URLs with {{var}} placeholders', () => {
  const language = { target: 'shell', client: 'curl' };
  const baseCollection = { root: { request: { auth: { mode: 'none' }, headers: [] } } };

  // Mirrors HTTPSnippet's internal encoding so post-processing's replaceAll has a
  // realistic httpSnippetPath to match against — same pattern as the encodeUrl block.
  const getEncodedPath = (url) => {
    const { parse } = require('url');
    const { stringify } = require('query-string');
    const parsed = parse(url, true, true);
    if (!parsed.query || Object.keys(parsed.query).length === 0) {
      return parsed.pathname;
    }
    const search = stringify(parsed.query, { sort: false });
    return search ? `${parsed.pathname}?${search}` : parsed.pathname;
  };

  const makeItem = (url, settings, rawUrl) => ({
    uid: 'tmpl-req',
    request: {
      method: 'GET',
      url,
      headers: [],
      body: { mode: 'none' },
      auth: { mode: 'none' }
    },
    ...(settings !== undefined && { settings }),
    ...(rawUrl !== undefined && { rawUrl })
  });

  beforeEach(() => {
    jest.clearAllMocks();
    require('httpsnippet').HTTPSnippet = jest.fn().mockImplementation((harRequest) => ({
      convert: jest.fn(() => {
        const method = harRequest?.method || 'GET';
        const url = harRequest?.url || 'http://example.com';
        const { parse } = require('url');
        const parsed = parse(url, false, true);
        const encodedPath = getEncodedPath(url);
        const fullEncodedUrl = `${parsed.protocol}//${parsed.host}${encodedPath}`;
        return `curl -X ${method} '${fullEncodedUrl}'`;
      })
    }));
  });

  it('generates snippet for URL with {{var}} in path (no interpolation)', () => {
    const url = 'https://example.com/users/{{id}}';
    const item = makeItem(url, { encodeUrl: false }, url);

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });

    expect(result).not.toBe('Error generating code snippet');
    expect(result).toContain('{{id}}');
    // Placeholder hash must be restored (no internal token leaking out)
    expect(result).not.toContain('bruno-var-hash-');
  });

  it('generates snippet for URL with {{var}} in authority (host)', () => {
    const url = 'https://{{baseUrl}}/users/list';
    const item = makeItem(url, { encodeUrl: false }, url);

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });

    expect(result).not.toBe('Error generating code snippet');
    expect(result).toContain('{{baseUrl}}');
    expect(result).not.toContain('bruno-var-hash-');
  });

  it('generates snippet for URL with multiple {{var}} in path', () => {
    const url = 'https://{{baseUrl}}/users/{{userId}}/posts/{{postId}}';
    const item = makeItem(url, { encodeUrl: false }, url);

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });

    expect(result).toContain('{{baseUrl}}');
    expect(result).toContain('{{userId}}');
    expect(result).toContain('{{postId}}');
    expect(result).not.toContain('bruno-var-hash-');
  });

  it('generates snippet for templated URL with encodeUrl: true (vars still restored)', () => {
    const url = 'https://example.com/users/{{id}}?q=hello world';
    const item = makeItem(url, { encodeUrl: true }, url);

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });

    expect(result).not.toBe('Error generating code snippet');
    expect(result).toContain('{{id}}');
    // Real space should still be encoded by encodeUrl
    expect(result).toContain('hello%20world');
    expect(result).not.toContain('bruno-var-hash-');
  });

  it('generates snippet for templated URL in query value', () => {
    const url = 'https://example.com/api?token={{apiToken}}';
    const item = makeItem(url, { encodeUrl: false }, url);

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });

    expect(result).toContain('{{apiToken}}');
    expect(result).not.toContain('bruno-var-hash-');
  });

  it('does not leak the hash prefix if conversion throws partway through', () => {
    // Force HTTPSnippet to throw; the outer catch returns 'Error generating code snippet'.
    // We just want to confirm request.url is restored so subsequent calls aren't poisoned.
    require('httpsnippet').HTTPSnippet = jest.fn(() => {
      throw new Error('mock failure');
    });
    const url = 'https://{{baseUrl}}/users';
    const item = makeItem(url, { encodeUrl: false }, url);
    const originalUrlOnItem = item.request.url;

    const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });

    expect(result).toBe('Error generating code snippet');
    // request.url restored on the shared object
    expect(item.request.url).toBe(originalUrlOnItem);
  });
});

describe('generateSnippet – HTTPSnippet HAR-validator-rejected chars (always-encode-before-HAR fix)', () => {
  const language = { target: 'shell', client: 'curl' };
  const baseCollection = { root: { request: { auth: { mode: 'none' }, headers: [] } } };

  // Mirror HTTPSnippet's behavior: emit the URL it received in the HAR. The fix
  // guarantees what it receives is always encoded, so the mock just echoes back.
  beforeEach(() => {
    jest.clearAllMocks();
    require('httpsnippet').HTTPSnippet = jest.fn().mockImplementation((harRequest) => ({
      convert: jest.fn(() => `curl -X ${harRequest?.method || 'GET'} '${harRequest?.url}'`)
    }));
  });

  const makeItem = (url, settings) => ({
    uid: 'reject-req',
    request: { method: 'GET', url, headers: [], body: { mode: 'none' }, auth: { mode: 'none' } },
    rawUrl: url,
    ...(settings !== undefined && { settings })
  });

  // Each row: raw form (what the user typed) → encoded form (what should hit the wire / HAR)
  const pathCases = [
    { name: 'literal space', raw: 'a b', encoded: 'a%20b' },
    { name: 'bare %', raw: '50%', encoded: '50%25' },
    { name: 'square bracket [', raw: '[abc', encoded: '%5Babc' },
    { name: 'square bracket ]', raw: 'abc]', encoded: 'abc%5D' },
    { name: 'less-than <', raw: 'a<b', encoded: 'a%3Cb' },
    { name: 'greater-than >', raw: 'a>b', encoded: 'a%3Eb' },
    { name: 'double quote', raw: 'a"b', encoded: 'a%22b' },
    { name: 'backslash', raw: 'a\\b', encoded: 'a%5Cb' },
    { name: 'caret ^', raw: 'a^b', encoded: 'a%5Eb' },
    { name: 'pipe |', raw: 'a|b', encoded: 'a%7Cb' },
    { name: 'curly {', raw: 'a{b', encoded: 'a%7Bb' },
    { name: 'curly }', raw: 'a}b', encoded: 'a%7Db' },
    { name: 'backtick `', raw: 'a`b', encoded: 'a%60b' },
    { name: 'raw unicode', raw: 'José', encoded: 'Jos%C3%A9' },
    { name: 'high unicode', raw: '中文', encoded: '%E4%B8%AD%E6%96%87' }
  ];

  describe.each(pathCases)('path char "$name"', ({ raw, encoded }) => {
    const rawUrl = `https://example.com/api/${raw}`;
    const encodedUrl = `https://example.com/api/${encoded}`;

    it('does not throw "Error generating code snippet" with toggle OFF', () => {
      const item = makeItem(rawUrl, { encodeUrl: false });
      const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
      expect(result).not.toBe('Error generating code snippet');
    });

    it('does not throw "Error generating code snippet" with toggle ON', () => {
      const item = makeItem(rawUrl, { encodeUrl: true });
      const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
      expect(result).not.toBe('Error generating code snippet');
    });

    it('toggle OFF → snippet output preserves the user-typed raw char via post-processing', () => {
      const item = makeItem(rawUrl, { encodeUrl: false });
      const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
      // Post-processing replaces encoded path with rawUrl, so the user sees their char
      expect(result).toContain(rawUrl);
    });

    it('toggle ON → snippet output shows the encoded form', () => {
      const item = makeItem(rawUrl, { encodeUrl: true });
      const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
      expect(result).toContain(encodedUrl);
    });
  });

  // Query-value cases need the chars inside `?key=value` rather than the path
  const queryCases = [
    { name: 'literal space', raw: 'a b', encoded: 'a%20b' },
    { name: 'bare %', raw: '50%', encoded: '50%25' },
    { name: 'square brackets', raw: 'a[b]', encoded: 'a%5Bb%5D' },
    { name: 'less/greater', raw: 'a<b>', encoded: 'a%3Cb%3E' },
    { name: 'double quote', raw: '"hi"', encoded: '%22hi%22' },
    { name: 'backslash', raw: 'a\\b', encoded: 'a%5Cb' },
    { name: 'caret', raw: 'a^b', encoded: 'a%5Eb' },
    { name: 'pipe', raw: 'a|b', encoded: 'a%7Cb' },
    { name: 'curly braces', raw: '{a}', encoded: '%7Ba%7D' },
    { name: 'backtick', raw: '`a`', encoded: '%60a%60' },
    { name: 'raw unicode', raw: 'José', encoded: 'Jos%C3%A9' }
  ];

  describe.each(queryCases)('query value char "$name"', ({ raw, encoded }) => {
    const rawUrl = `https://example.com/api?q=${raw}`;
    const encodedUrl = `https://example.com/api?q=${encoded}`;

    it('does not throw with toggle OFF', () => {
      const item = makeItem(rawUrl, { encodeUrl: false });
      const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
      expect(result).not.toBe('Error generating code snippet');
    });

    it('toggle OFF → snippet output preserves user-typed query value', () => {
      const item = makeItem(rawUrl, { encodeUrl: false });
      const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
      expect(result).toContain(rawUrl);
    });

    it('toggle ON → snippet output shows the encoded form', () => {
      const item = makeItem(rawUrl, { encodeUrl: true });
      const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
      expect(result).toContain(encodedUrl);
    });
  });

  // A few combination cases to prove path + query + multiple chars all work together
  describe('combinations', () => {
    it('handles multiple rejected chars in path simultaneously', () => {
      const url = 'https://example.com/api/list[1]/José/{x}';
      const item = makeItem(url, { encodeUrl: false });
      const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
      expect(result).not.toBe('Error generating code snippet');
      expect(result).toContain(url);
    });

    it('handles rejected chars in both path and query', () => {
      const url = 'https://example.com/api/list[1]?q=a|b';
      const item = makeItem(url, { encodeUrl: false });
      const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
      expect(result).not.toBe('Error generating code snippet');
      expect(result).toContain(url);
    });

    it('toggle ON + multiple rejected chars produces fully encoded snippet', () => {
      const url = 'https://example.com/api/list[1]?q=a|b';
      const item = makeItem(url, { encodeUrl: true });
      const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
      expect(result).not.toBe('Error generating code snippet');
      expect(result).toContain('list%5B1%5D');
      expect(result).toContain('a%7Cb');
      // No raw rejected chars left in output
      expect(result).not.toMatch(/list\[1\]/);
      expect(result).not.toMatch(/a\|b/);
    });

    it('pre-encoded URL with rejected chars round-trips idempotently with toggle ON', () => {
      const url = 'https://example.com/api/list%5B1%5D?q=a%7Cb';
      const item = makeItem(url, { encodeUrl: true });
      const result = generateSnippet({ language, item, collection: baseCollection, shouldInterpolate: false });
      expect(result).toContain(url);
      expect(result).not.toContain('%255B'); // no double-encoding
    });
  });
});
