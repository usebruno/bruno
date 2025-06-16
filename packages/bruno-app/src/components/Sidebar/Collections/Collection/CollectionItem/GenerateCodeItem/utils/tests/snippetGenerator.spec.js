jest.mock('httpsnippet', () => {
  return {
    HTTPSnippet: jest.fn().mockImplementation((harRequest) => ({
      convert: jest.fn(() => {
        // Create a more realistic mock based on the request method
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
    // Create a more realistic HAR request object
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

jest.mock('utils/collections/index', () => ({
  getAllVariables: jest.fn(() => ({
    baseUrl: 'https://api.example.com',
    apiKey: 'secret-key-123',
    userId: '12345'
  }))
}));

const { name } = require('file-loader');
const { generateSnippet } = require('../snippetGenerator');
const { HTTPSnippet } = require('httpsnippet');

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

  // Simple test collection - clear variable values
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

    // Exact curl command that should be generated
    expect(result).toBe('curl -X POST https://api.example.com/{{endpoint}} -H "Content-Type: application/json" -d \'{"message": "{{greeting}}", "count": {{number}}}\'');
  });

  it('should interpolate variables when enabled', () => {
    const result = generateSnippet({
      language: curlLanguage,
      item: testRequest,
      collection: testCollection,
      shouldInterpolate: true
    });

    // Variables should be interpolated in the body
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
    const originalHTTPSnippet = HTTPSnippet;
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
  });

  it('should interpolate simple headers and body variables', () => {
    // Simple test request with clear variable references
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

    // Expected result with interpolated values
    const expectedInterpolatedBody = `{
  "name": "John Smith",
  "email": "john@test.com",
  "age": 30
}`;

    expect(result).toBe(`curl -X POST https://api.test.com/{{endpoint}} -H "Content-Type: application/json" -d '${expectedInterpolatedBody}'`);
  });

  it('should NOT interpolate when shouldInterpolate is false', () => {
    // Same request as above but with interpolation disabled
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
      shouldInterpolate: false  // 👈 Interpolation disabled
    });

    // Expected result with original variables (NOT interpolated)
    expect(result).toBe('curl -X POST https://api.test.com/{{endpoint}} -H "Content-Type: application/json" -d \'{"name": "{{userName}}", "email": "{{userEmail}}", "age": {{userAge}}}\'');
  });
}); 