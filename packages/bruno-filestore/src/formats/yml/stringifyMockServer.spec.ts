import stringifyMockServer from './stringifyMockServer';
import parseMockServer from './parseMockServer';
import type { BrunoMockServer } from './mockServerTypes';

const fullMockServer: BrunoMockServer = {
  name: 'Dog API Mock',
  port: 4001,
  delay: 500,
  source: {
    type: 'collection',
    path: '/Users/x/collections/dog-api'
  },
  routes: [
    {
      name: 'Get user 200',
      description: 'Returns a user',
      request: {
        url: '/users/:id',
        method: 'GET',
        headers: [{ uid: 'h1', name: 'X-Client', value: 'bruno', enabled: true }],
        params: [{ uid: 'p1', name: 'id', value: '1', type: 'path', enabled: true }],
        body: { mode: 'json', json: '{"filter": true}' }
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: [{ uid: 'rh1', name: 'Content-Type', value: 'application/json', enabled: true }],
        body: {
          type: 'json',
          content: '{"id": 1}'
        }
      },
      rules: {
        operator: 'AND',
        conditions: [
          { target: 'header', key: 'Authorization', operator: 'equals', value: 'token' }
        ]
      },
      copiedFrom: {
        exampleName: 'Success',
        requestPathname: '/Users/x/collections/dog-api/get-user.yml'
      }
    }
  ]
};

describe('stringifyMockServer', () => {
  it('writes the info block with type mock', () => {
    const content = stringifyMockServer(fullMockServer);

    expect(content).toContain('info:');
    expect(content).toContain('name: Dog API Mock');
    expect(content).toContain('type: mock');
  });

  it('writes port, delay and source under the mock block', () => {
    const content = stringifyMockServer(fullMockServer);

    expect(content).toContain('mock:');
    expect(content).toContain('port: 4001');
    expect(content).toContain('delay: 500');
    expect(content).toContain('type: collection');
    expect(content).toContain('path: /Users/x/collections/dog-api');
  });

  it('omits delay when zero and source when manual', () => {
    const content = stringifyMockServer({
      name: 'Manual Mock',
      port: 4000,
      delay: 0,
      source: null,
      routes: []
    });

    expect(content).not.toContain('delay:');
    expect(content).not.toContain('source:');
    expect(content).not.toContain('routes:');
  });

  it('omits rules when there are no conditions', () => {
    const content = stringifyMockServer({
      name: 'Mock',
      port: 4000,
      delay: 0,
      source: null,
      routes: [
        {
          name: 'Ping',
          description: '',
          request: { url: '/ping', method: 'GET', headers: [], params: [], body: { mode: 'none' } },
          response: { status: 204, statusText: 'No Content', headers: [], body: { type: 'text', content: '' } },
          rules: { operator: 'AND', conditions: [] }
        }
      ]
    });

    expect(content).not.toContain('rules:');
  });

  it('does not write uids anywhere', () => {
    const content = stringifyMockServer(fullMockServer);
    expect(content).not.toContain('uid');
  });
});

describe('mock server round-trip', () => {
  it('parse(stringify(x)) preserves all fields', () => {
    const parsed = parseMockServer(stringifyMockServer(fullMockServer));

    expect(parsed.name).toBe('Dog API Mock');
    expect(parsed.port).toBe(4001);
    expect(parsed.delay).toBe(500);
    expect(parsed.source).toEqual({ type: 'collection', path: '/Users/x/collections/dog-api' });

    expect(parsed.routes).toHaveLength(1);
    const route = parsed.routes[0];
    expect(route.name).toBe('Get user 200');
    expect(route.description).toBe('Returns a user');
    expect(route.request.url).toBe('/users/:id');
    expect(route.request.method).toBe('GET');
    expect(route.request.headers).toEqual([
      expect.objectContaining({ name: 'X-Client', value: 'bruno', enabled: true })
    ]);
    expect(route.request.params).toEqual([
      expect.objectContaining({ name: 'id', value: '1', type: 'path', enabled: true })
    ]);
    expect(route.request.body).toEqual(expect.objectContaining({ mode: 'json', json: '{"filter": true}' }));
    expect(route.response.status).toBe(200);
    expect(route.response.statusText).toBe('OK');
    expect(route.response.headers).toEqual([
      expect.objectContaining({ name: 'Content-Type', value: 'application/json' })
    ]);
    expect(route.response.body).toEqual({ type: 'json', content: '{"id": 1}' });
    expect(route.rules).toEqual({
      operator: 'AND',
      conditions: [{ target: 'header', key: 'Authorization', operator: 'equals', value: 'token' }]
    });
    expect(route.copiedFrom).toEqual({
      exampleName: 'Success',
      requestPathname: '/Users/x/collections/dog-api/get-user.yml'
    });
  });

  it('round-trips a spec-sourced server', () => {
    const parsed = parseMockServer(stringifyMockServer({
      name: 'Spec Mock',
      port: 4002,
      delay: 0,
      source: { type: 'spec', path: '/Users/x/specs/petstore.yml' },
      routes: []
    }));

    expect(parsed.source).toEqual({ type: 'spec', path: '/Users/x/specs/petstore.yml' });
    expect(parsed.routes).toEqual([]);
  });

  it('round-trips multiline json response bodies byte-safely', () => {
    const content = '{\n  "id": 1,\n  "name": "rex: \'good\' dog"\n}';
    const parsed = parseMockServer(stringifyMockServer({
      name: 'Mock',
      port: 4000,
      delay: 0,
      source: null,
      routes: [
        {
          name: 'Get dog',
          description: '',
          request: { url: '/dogs/1', method: 'GET', headers: [], params: [], body: { mode: 'none' } },
          response: { status: 200, statusText: 'OK', headers: [], body: { type: 'json', content } },
          rules: { operator: 'AND', conditions: [] }
        }
      ]
    }));

    expect(parsed.routes[0].response.body.content).toBe(content);
  });
});
