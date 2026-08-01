import {
  buildMockResponseEditorItem,
  getMockResponseItemUid,
  mockResponseFromEditorItem
} from './editor';

describe('mock response editor utils', () => {
  const sampleMockResponse = {
    uid: 'response-1',
    name: 'Users list',
    description: 'Returns users',
    request: {
      url: '/users',
      method: 'GET',
      headers: [{ uid: 'h1', name: 'Accept', value: 'application/json', enabled: true }],
      params: [{ uid: 'p1', name: 'page', value: '1', enabled: true }],
      body: { mode: 'none' }
    },
    response: {
      status: 200,
      statusText: 'OK',
      headers: [],
      body: { type: 'json', content: '{"users":[]}' }
    },
    rules: {
      operator: 'AND',
      conditions: []
    },
    copiedFrom: {
      exampleName: 'Users',
      requestPathname: 'users.bru'
    }
  };

  it('builds an editor item with a draft example', () => {
    const item = buildMockResponseEditorItem(sampleMockResponse);

    expect(item.uid).toBe(getMockResponseItemUid('response-1'));
    expect(item.draft.examples).toHaveLength(1);
    expect(item.draft.examples[0].request.url).toBe('/users');
    expect(item.draft.examples[0].response.body.content).toBe('{"users":[]}');
  });

  it('converts an editor item back to a mock response', () => {
    const item = buildMockResponseEditorItem(sampleMockResponse);
    item.draft.examples[0].name = 'Updated name';
    item.draft.examples[0].response.status = 404;

    const mockResponse = mockResponseFromEditorItem(
      item,
      'response-1',
      { operator: 'OR', conditions: [{ target: 'query', key: 'id', operator: 'equals', value: '1' }] },
      sampleMockResponse
    );

    expect(mockResponse.name).toBe('Updated name');
    expect(mockResponse.response.status).toBe(404);
    expect(mockResponse.rules.operator).toBe('OR');
    expect(mockResponse.copiedFrom.exampleName).toBe('Users');
  });
});
