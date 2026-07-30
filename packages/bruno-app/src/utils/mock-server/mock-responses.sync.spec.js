import {
  getMockResponseRouteKey,
  syncMockResponsesFromExamples,
  buildMockRouteTable,
  countMatchedRouteHits
} from './mock-responses';

jest.mock('utils/common', () => ({
  uuid: () => 'generated-uid'
}));

describe('syncMockResponsesFromExamples', () => {
  it('overrides matching responses and keeps custom ones', () => {
    const existingResponses = [
      {
        uid: 'custom-1',
        name: 'Custom Pets',
        request: { url: '/pets', method: 'GET' },
        response: { status: 200, body: { type: 'json', content: '{"custom":true}' } },
        rules: { operator: 'AND', conditions: [{ uid: 'rule-1', target: 'query', key: 'page', operator: 'equals', value: '1' }] }
      },
      {
        uid: 'users-1',
        name: 'Users old',
        request: { url: '/users', method: 'GET' },
        response: { status: 200, body: { type: 'json', content: '{}' } },
        rules: { operator: 'AND', conditions: [] }
      }
    ];

    const exampleEntries = [
      {
        item: { pathname: 'users.bru', request: { url: '/users', method: 'GET' } },
        example: {
          name: 'Users success',
          request: { url: '/users', method: 'GET' },
          response: { status: 200, body: { type: 'json', content: '{"synced":true}' } }
        }
      },
      {
        item: { pathname: 'orders.bru', request: { url: '/orders', method: 'POST' } },
        example: {
          name: 'Create order',
          request: { url: '/orders', method: 'POST' },
          response: { status: 201, body: { type: 'json', content: '{"id":1}' } }
        }
      }
    ];

    const synced = syncMockResponsesFromExamples(existingResponses, exampleEntries);

    expect(synced).toHaveLength(3);
    expect(synced.find((item) => item.uid === 'custom-1')?.response.body.content).toBe('{"custom":true}');
    expect(synced.find((item) => item.uid === 'users-1')?.response.body.content).toBe('{"synced":true}');
    expect(synced.find((item) => item.uid === 'generated-uid')?.name).toBe('Create order (mock)');
    expect(getMockResponseRouteKey(synced.find((item) => item.uid === 'users-1'))).toBe('GET /users::200');
  });
});

describe('buildMockRouteTable', () => {
  it('groups responses by method and path', () => {
    const routes = buildMockRouteTable([
      {
        uid: 'a',
        name: 'Users',
        request: { url: 'https://api.example.com/users', method: 'get' },
        response: { status: 200 }
      },
      {
        uid: 'b',
        name: 'Users error',
        request: { url: '/users', method: 'GET' },
        response: { status: 401 }
      }
    ]);

    expect(routes).toEqual([
      {
        method: 'GET',
        path: '/users',
        responseCount: 2,
        responses: [
          { uid: 'a', name: 'Users', status: 200, sourceFile: 'mock-response' },
          { uid: 'b', name: 'Users error', status: 401, sourceFile: 'mock-response' }
        ],
        defaultResponse: 'Users'
      }
    ]);
  });
});

describe('countMatchedRouteHits', () => {
  it('counts only matched log entries', () => {
    expect(countMatchedRouteHits([
      { matched: true, method: 'GET', path: '/users' },
      { matched: true, method: 'GET', path: '/users' },
      { matched: false, method: 'GET', path: '/users' },
      { matched: true, method: 'POST', path: '/users' }
    ])).toEqual({
      'GET /users': 2,
      'POST /users': 1
    });
  });
});
