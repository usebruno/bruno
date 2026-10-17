import parseMockServer from './parseMockServer';

describe('parseMockServer', () => {
  it('parses a full mock server file', () => {
    const content = `
info:
  name: Dog API Mock
  type: mock

mock:
  port: 4001
  delay: 250
  source:
    type: collection
    path: /Users/x/collections/dog-api

routes:
  - name: Get user 200
    description: Returns a user
    request:
      method: GET
      url: /users/:id
      headers:
        - name: X-Client
          value: bruno
    response:
      status: 200
      statusText: OK
      headers:
        - name: Content-Type
          value: application/json
      body:
        type: json
        data: |-
          {"id": 1}
    rules:
      operator: OR
      conditions:
        - target: query
          key: token
          operator: equals
          value: abc
    copiedFrom:
      example: Success
      requestPath: /Users/x/collections/dog-api/get-user.yml
`;

    const mockServer = parseMockServer(content);

    expect(mockServer.name).toBe('Dog API Mock');
    expect(mockServer.port).toBe(4001);
    expect(mockServer.delay).toBe(250);
    expect(mockServer.source).toEqual({ type: 'collection', path: '/Users/x/collections/dog-api' });

    expect(mockServer.routes).toHaveLength(1);
    const route = mockServer.routes[0];
    expect(route.name).toBe('Get user 200');
    expect(route.request.method).toBe('GET');
    expect(route.request.url).toBe('/users/:id');
    expect(route.request.headers[0]).toEqual(
      expect.objectContaining({ name: 'X-Client', value: 'bruno', enabled: true })
    );
    expect(route.request.headers[0].uid).toBeTruthy();
    expect(route.response.status).toBe(200);
    expect(route.response.body).toEqual({ type: 'json', content: '{"id": 1}' });
    expect(route.rules.operator).toBe('OR');
    expect(route.rules.conditions).toEqual([
      { target: 'query', key: 'token', operator: 'equals', value: 'abc' }
    ]);
    expect(route.copiedFrom).toEqual({
      exampleName: 'Success',
      requestPathname: '/Users/x/collections/dog-api/get-user.yml'
    });
  });

  it('applies safe defaults for a minimal file', () => {
    const mockServer = parseMockServer('info:\n  name: Tiny Mock\n');

    expect(mockServer).toEqual({
      name: 'Tiny Mock',
      port: null,
      delay: 0,
      source: null,
      routes: []
    });
  });

  it('defaults route request/response blocks that are missing', () => {
    const mockServer = parseMockServer(`
info:
  name: Mock

routes:
  - name: Bare route
`);

    const route = mockServer.routes[0];
    expect(route.request.url).toBe('/');
    expect(route.request.method).toBe('GET');
    expect(route.request.body.mode).toBe('none');
    expect(route.response.status).toBe(200);
    expect(route.response.body).toEqual({ type: 'json', content: '' });
    expect(route.rules).toEqual({ operator: 'AND', conditions: [] });
    expect(route.copiedFrom).toBeUndefined();
  });

  it('ignores a source block without a path', () => {
    const mockServer = parseMockServer(`
info:
  name: Mock

mock:
  source:
    type: collection
`);

    expect(mockServer.source).toBeNull();
  });

  it('rejects non-string source paths', () => {
    const numericPath = parseMockServer(`
info:
  name: Mock

mock:
  source:
    type: collection
    path: 12345
`);
    expect(numericPath.source).toBeNull();

    const objectPath = parseMockServer(`
info:
  name: Mock

mock:
  source:
    type: spec
    path:
      nested: value
`);
    expect(objectPath.source).toBeNull();
  });

  it('rejects non-string copiedFrom values', () => {
    const mockServer = parseMockServer(`
info:
  name: Mock

routes:
  - name: Numeric example
    copiedFrom:
      example: 42
      requestPath: /real/path.yml
  - name: Object request path
    copiedFrom:
      example: Success
      requestPath:
        nested: value
  - name: Fully malformed
    copiedFrom:
      example: 1
      requestPath: 2
`);

    expect(mockServer.routes[0].copiedFrom).toEqual({
      exampleName: null,
      requestPathname: '/real/path.yml'
    });
    expect(mockServer.routes[1].copiedFrom).toEqual({
      exampleName: 'Success',
      requestPathname: null
    });
    expect(mockServer.routes[2].copiedFrom).toBeUndefined();
  });

  it('throws on non-object content', () => {
    expect(() => parseMockServer('- a\n- b\n')).toThrow('Invalid mock server file');
  });
});
