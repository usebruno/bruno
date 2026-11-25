jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: jest.fn(() => [])
  }
}));

const { findParameterizedMatch } = require('../src/app/mock-server/mock-server');

describe('findParameterizedMatch', () => {
  const todoExamples = [{ responseUid: 'todo' }];
  const routeMap = new Map([
    ['GET /todos/:id', todoExamples],
    ['GET /todos/:id/items/:itemId', [{ responseUid: 'item' }]],
    ['POST /todos/:id', [{ responseUid: 'post' }]]
  ]);

  it('returns the matched examples with the route params', () => {
    expect(findParameterizedMatch(routeMap, 'GET', '/todos/1')).toEqual({ examples: todoExamples, params: { id: '1' } });
    expect(findParameterizedMatch(routeMap, 'GET', '/todos/1/items/2').params).toEqual({ id: '1', itemId: '2' });
  });

  it('decodes param values and keeps malformed ones raw', () => {
    expect(findParameterizedMatch(routeMap, 'GET', '/todos/a%20b').params).toEqual({ id: 'a b' });
    expect(findParameterizedMatch(routeMap, 'GET', '/todos/%E0%A4%A').params).toEqual({ id: '%E0%A4%A' });
  });

  it('returns null when no route matches the method or shape', () => {
    expect(findParameterizedMatch(routeMap, 'DELETE', '/todos/1')).toBeNull();
    expect(findParameterizedMatch(routeMap, 'GET', '/users/1')).toBeNull();
  });
});
