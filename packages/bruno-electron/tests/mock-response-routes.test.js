const fs = require('fs');
const os = require('os');
const path = require('path');
const { saveMockResponse } = require('../src/app/mock-response-store');
const {
  buildRouteMapFromMockResponses,
  countRouteResponses,
  extractRoutePath,
  routeMapToRouteTable
} = require('../src/app/mock-response-routes');

describe('mock-response-routes', () => {
  let workspacePath;

  beforeEach(() => {
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-mock-routes-'));
  });

  afterEach(() => {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  it('extracts route paths from mock response urls', () => {
    expect(extractRoutePath('{{baseUrl}}/products')).toBe('/products');
    expect(extractRoutePath('{{baseUrl}}/breeds')).toBe('/breeds');
    expect(extractRoutePath('/users/:userId')).toBe('/users/:userId');
    expect(extractRoutePath('google.com/test')).toBe('/test');
    expect(extractRoutePath('https://api.example.com/v1/users')).toBe('/v1/users');
    expect(extractRoutePath('127.0.0.1:8080/api')).toBe('/api');
  });

  it('builds route table rows from stored mock responses', () => {
    const location = {
      mockServerUid: 'mock-1',
      sourceType: 'spec',
      workspacePath
    };

    saveMockResponse(location, {
      uid: 'response-1',
      name: 'List products',
      request: { url: '{{baseUrl}}/products', method: 'GET' },
      response: { status: 200, body: { type: 'json', content: '[]' } },
      rules: { operator: 'AND', conditions: [] }
    });

    saveMockResponse(location, {
      uid: 'response-2',
      name: 'Unauthorized login',
      request: { url: '/auth/login', method: 'POST' },
      response: { status: 401, body: { type: 'json', content: '{}' } },
      rules: { operator: 'AND', conditions: [{ target: 'header', key: 'Authorization', operator: 'equals', value: 'missing' }] }
    });

    saveMockResponse(location, {
      uid: 'response-3',
      name: 'Login success',
      request: { url: '/auth/login', method: 'POST' },
      response: { status: 200, body: { type: 'json', content: '{}' } },
      rules: { operator: 'AND', conditions: [] }
    });

    const routeMap = buildRouteMapFromMockResponses(location);
    const routes = routeMapToRouteTable(routeMap);

    expect(routeMap.size).toBe(2);
    expect(countRouteResponses(routeMap)).toBe(3);
    expect(routes).toEqual([
      {
        method: 'GET',
        path: '/products',
        responseCount: 1,
        responses: [
          { uid: 'response-1', name: 'List products', status: 200, sourceFile: 'mock-response' }
        ],
        defaultResponse: 'List products'
      },
      {
        method: 'POST',
        path: '/auth/login',
        responseCount: 2,
        responses: [
          { uid: 'response-2', name: 'Unauthorized login', status: 401, sourceFile: 'mock-response' },
          { uid: 'response-3', name: 'Login success', status: 200, sourceFile: 'mock-response' }
        ],
        defaultResponse: 'Unauthorized login'
      }
    ]);
  });
});
