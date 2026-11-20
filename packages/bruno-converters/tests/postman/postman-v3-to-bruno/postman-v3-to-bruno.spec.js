import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';
import { isPostmanV3Collection } from '../../../src/postman/postman-v3-to-bruno';
import { makeV3Collection, makeV3Folder, makeV3Request } from '../../common/postman-collection';

const basicAuth = (username) => ({
  type: 'basic',
  credentials: [
    { key: 'username', value: username },
    { key: 'password', value: 'secret' }
  ]
});

describe('isPostmanV3Collection', () => {
  it('detects a v3 collection', () => {
    expect(isPostmanV3Collection(makeV3Collection([]))).toBe(true);
  });

  it('rejects a v2.1 collection', () => {
    expect(isPostmanV3Collection({ info: { schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [] })).toBe(false);
  });
});

describe('postmanToBruno with a v3 collection', () => {
  it('imports folders, requests and the collection docs', async () => {
    const { collection, issues } = await postmanToBruno(makeV3Collection([
      makeV3Folder('Users', [makeV3Request('Get User', { description: 'Fetches a user' })], { description: 'User endpoints' })
    ], { name: 'My API', description: 'Top level docs' }));

    expect(issues).toEqual([]);
    expect(collection.name).toBe('My API');
    expect(collection.root.docs).toBe('Top level docs');

    const [folder] = collection.items;
    expect(folder).toMatchObject({ type: 'folder', name: 'Users', root: { docs: 'User endpoints' } });
    expect(folder.items[0]).toMatchObject({
      type: 'http-request',
      name: 'Get User',
      request: { url: 'https://example.com', method: 'GET', docs: 'Fetches a user' }
    });
  });

  describe('auth', () => {
    it('unwraps collection and folder auth lists and request auth objects', async () => {
      const { collection } = await postmanToBruno(makeV3Collection([
        makeV3Folder('Folder', [makeV3Request('Own Auth', { auth: basicAuth('request-user') })], {
          auth: [{ id: 'a1', name: 'basic auth', ...basicAuth('folder-user') }]
        })
      ], { auth: [{ id: 'a2', name: 'basic auth', ...basicAuth('collection-user') }] }));

      expect(collection.root.request.auth).toMatchObject({ mode: 'basic', basic: { username: 'collection-user' } });
      expect(collection.items[0].root.request.auth).toMatchObject({ mode: 'basic', basic: { username: 'folder-user' } });
      expect(collection.items[0].items[0].request.auth).toMatchObject({ mode: 'basic', basic: { username: 'request-user' } });
    });

    it('treats missing auth as none on the collection and inherit below it', async () => {
      const { collection } = await postmanToBruno(makeV3Collection([
        makeV3Folder('Folder', [makeV3Request('Inherited')])
      ]));

      expect(collection.root.request.auth.mode).toBe('none');
      expect(collection.items[0].root.request.auth.mode).toBe('inherit');
      expect(collection.items[0].items[0].request.auth.mode).toBe('inherit');
    });

    it('treats an explicit inherit like a missing auth', async () => {
      const inherit = { type: 'inherit', credentials: [] };
      const { collection, issues } = await postmanToBruno(makeV3Collection([
        makeV3Folder('Folder', [makeV3Request('Inherited', { auth: inherit })], { auth: [inherit] })
      ], { auth: [inherit] }));

      expect(issues).toEqual([]);
      expect(collection.root.request.auth.mode).toBe('none');
      expect(collection.items[0].root.request.auth.mode).toBe('inherit');
      expect(collection.items[0].items[0].request.auth.mode).toBe('inherit');
    });

    it('maps noauth to none', async () => {
      const { collection } = await postmanToBruno(makeV3Collection([
        makeV3Request('No Auth', { auth: { type: 'noauth' } })
      ]));

      expect(collection.items[0].request.auth.mode).toBe('none');
    });

    it('reports an unsupported auth type and imports it as no auth', async () => {
      const { collection, issues } = await postmanToBruno(makeV3Collection([
        makeV3Request('Hawk', { auth: { type: 'hawk', credentials: [{ key: 'authId', value: 'id' }] } })
      ]));

      expect(collection.items[0].request.auth.mode).toBe('none');
      expect(issues).toEqual([{ path: 'Hawk', severity: 'warning', message: 'Unsupported auth type "hawk", imported as no auth' }]);
    });
  });

  describe('body', () => {
    it.each([
      ['json', '{"a":1}', { mode: 'json', json: '{"a":1}' }],
      ['xml', '<a/>', { mode: 'xml', xml: '<a/>' }],
      ['text', 'hello', { mode: 'text', text: 'hello' }],
      ['html', '<p>hi</p>', { mode: 'text', text: '<p>hi</p>' }],
      ['javascript', 'let a = 1;', { mode: 'text', text: 'let a = 1;' }]
    ])('maps a %s raw body', async (type, content, expected) => {
      const { collection } = await postmanToBruno(makeV3Collection([
        makeV3Request('Raw', { method: 'POST', body: { type, content } })
      ]));

      expect(collection.items[0].request.body).toMatchObject(expected);
    });

    it('maps form data text and file fields', async () => {
      const { collection } = await postmanToBruno(makeV3Collection([
        makeV3Request('Form', {
          method: 'POST',
          body: {
            type: 'formdata',
            content: [
              { type: 'text', key: 'name', value: 'Ada', description: 'the name' },
              { type: 'file', key: 'avatar', src: ['/tmp/avatar.png'] },
              { type: 'text', key: 'off', value: 'x', disabled: true }
            ]
          }
        })
      ]));

      const { body } = collection.items[0].request;
      expect(body.mode).toBe('multipartForm');
      expect(body.multipartForm).toMatchObject([
        { type: 'text', name: 'name', value: 'Ada', description: 'the name', enabled: true },
        { type: 'file', name: 'avatar', value: ['/tmp/avatar.png'], enabled: true },
        { type: 'text', name: 'off', value: 'x', enabled: false }
      ]);
    });

    it('maps url-encoded fields', async () => {
      const { collection } = await postmanToBruno(makeV3Collection([
        makeV3Request('Url Encoded', {
          method: 'POST',
          body: { type: 'urlencoded', content: [{ key: 'a', value: '1' }, { key: 'b', value: '2', disabled: true }] }
        })
      ]));

      const { body } = collection.items[0].request;
      expect(body.mode).toBe('formUrlEncoded');
      expect(body.formUrlEncoded).toMatchObject([
        { name: 'a', value: '1', enabled: true },
        { name: 'b', value: '2', enabled: false }
      ]);
    });

    it('maps a binary file body and infers its content type', async () => {
      const { collection } = await postmanToBruno(makeV3Collection([
        makeV3Request('Binary', { method: 'POST', body: { type: 'file', content: { src: '/tmp/data.json' } } })
      ]));

      const { body } = collection.items[0].request;
      expect(body.mode).toBe('file');
      expect(body.file).toMatchObject([{ filePath: '/tmp/data.json', contentType: 'application/json', selected: true }]);
    });

    it('maps a none body without reporting it', async () => {
      const { collection, issues } = await postmanToBruno(makeV3Collection([
        makeV3Request('Empty', { method: 'POST', body: { type: 'none' } })
      ]));

      expect(collection.items[0].request.body.mode).toBe('none');
      expect(issues).toEqual([]);
    });

    it.each([
      ['a body without a type', { content: 'abc' }],
      ['a body that is not an object', 'abc']
    ])('reports %s and imports the request without a body', async (_, body) => {
      const { collection, issues } = await postmanToBruno(makeV3Collection([
        makeV3Request('Malformed', { method: 'POST', body })
      ]));

      expect(collection.items[0].request.body.mode).toBe('none');
      expect(issues).toEqual([{ path: 'Malformed', severity: 'warning', message: 'Malformed body (no type), imported without a body' }]);
    });

    it('reports an unsupported body type and imports the request without a body', async () => {
      const { collection, issues } = await postmanToBruno(makeV3Collection([
        makeV3Request('Odd', { method: 'POST', body: { type: 'sparql', content: 'SELECT *' } })
      ]));

      expect(collection.items[0].request.body.mode).toBe('none');
      expect(issues).toEqual([{ path: 'Odd', severity: 'warning', message: 'Unsupported body type "sparql", imported without a body' }]);
    });
  });

  it('maps headers, query params and path variables', async () => {
    const { collection } = await postmanToBruno(makeV3Collection([
      makeV3Request('Params', {
        url: '/users/:id?page=1#section',
        headers: [{ key: 'X-Trace', value: 'abc', description: 'trace id' }],
        queryParams: [{ key: 'page', value: '1' }, { key: 'size', value: '10', disabled: true }],
        pathVariables: [{ key: 'id', value: '101' }]
      })
    ]));

    const { request } = collection.items[0];
    expect(request.url).toBe('/users/:id?page=1');
    expect(request.headers).toMatchObject([{ name: 'X-Trace', value: 'abc', description: 'trace id', enabled: true }]);
    expect(request.params).toMatchObject([
      { name: 'page', value: '1', type: 'query', enabled: true },
      { name: 'size', value: '10', type: 'query', enabled: false },
      { name: 'id', value: '101', type: 'path', enabled: true }
    ]);
  });

  it('maps request settings and reports an invalid maxRedirects', async () => {
    const { collection, issues } = await postmanToBruno(makeV3Collection([
      makeV3Request('Settings', {
        settings: { followRedirects: false, followAuthorizationHeader: true, disableUrlEncoding: true, maxRedirects: 3 }
      }),
      makeV3Request('Bad Redirects', { settings: { maxRedirects: -1 } })
    ]));

    expect(collection.items[0].settings).toEqual({
      encodeUrl: false,
      forwardAuthorizationHeader: true,
      followRedirects: false,
      maxRedirects: 3
    });
    expect(issues).toEqual([{ path: 'Bad Redirects', severity: 'warning', message: 'Invalid maxRedirects, ignored (must be a number of 0 or more)' }]);
  });

  describe('scripts', () => {
    const scriptedCollection = () => makeV3Collection([
      makeV3Folder('Folder', [
        makeV3Request('Scripted', {
          scripts: [
            { type: 'beforeRequest', code: 'pm.environment.set("token", "abc");', language: 'text/javascript' },
            { type: 'afterResponse', code: 'console.log("request post")', language: 'text/javascript' }
          ]
        })
      ], {
        scripts: [{ type: 'http:beforeRequest', code: 'console.log("folder pre")', language: 'text/javascript' }]
      })
    ], {
      scripts: [{ type: 'http:afterResponse', code: 'console.log("collection post")', language: 'text/javascript' }]
    });

    it('imports scripts at every level and translates pm.* calls', async () => {
      const { collection, issues } = await postmanToBruno(scriptedCollection());

      expect(issues).toEqual([]);
      expect(collection.root.request.script.res).toBe('console.log("collection post")');
      expect(collection.items[0].root.request.script.req).toBe('console.log("folder pre")');
      expect(collection.items[0].items[0].request.script).toEqual({
        req: 'bru.setEnvVar("token", "abc");',
        res: 'console.log("request post")'
      });
    });

    it('keeps scripts verbatim when preserving them', async () => {
      const { collection } = await postmanToBruno(scriptedCollection(), { preserveScripts: true });

      expect(collection.items[0].items[0].request.script.req).toBe('pm.environment.set("token", "abc");');
    });

    it('reports a script type it cannot place', async () => {
      const { issues } = await postmanToBruno(makeV3Collection([
        makeV3Request('Grpc Script', { scripts: [{ type: 'grpc:onMessage', code: 'console.log(1)' }] })
      ]));

      expect(issues).toEqual([{ path: 'Grpc Script', severity: 'warning', message: 'Unsupported script type "grpc:onMessage", not imported' }]);
    });

    it('reports packages required through pm.require', async () => {
      const { collection } = await postmanToBruno(makeV3Collection([
        makeV3Request('Package', { scripts: [{ type: 'beforeRequest', code: 'const _ = pm.require(\'npm:left-pad@1.3.0\');' }] })
      ]));

      expect(collection.items[0].request.script.req).toBe('const _ = require(\'left-pad\');');
      expect(collection.packageReport.needsInstall).toEqual(['left-pad']);
    });
  });

  describe('method', () => {
    it('defaults a request without a method to GET', async () => {
      const { collection, issues } = await postmanToBruno(makeV3Collection([
        makeV3Request('No Method', { method: undefined }),
        makeV3Request('Empty Method', { method: '  ' })
      ]));

      expect(issues).toEqual([]);
      expect(collection.items.map((item) => item.request.method)).toEqual(['GET', 'GET']);
    });

    it('trims and upper-cases the method, and falls back to the request method in examples', async () => {
      const { collection } = await postmanToBruno(makeV3Collection([
        makeV3Request('Spaced', {
          method: ' post ',
          examples: [
            { $kind: 'http-example', name: 'Own Method', request: { method: ' put ' }, response: {} },
            { $kind: 'http-example', name: 'No Method', request: {}, response: {} }
          ]
        })
      ]));

      const [item] = collection.items;
      expect(item.request.method).toBe('POST');
      expect(item.examples.map((example) => example.request.method)).toEqual(['PUT', 'POST']);
    });
  });

  it('imports examples and derives the response body type from Content-Type', async () => {
    const { collection } = await postmanToBruno(makeV3Collection([
      makeV3Request('Create User', {
        method: 'POST',
        examples: [{
          $kind: 'http-example',
          name: '201 Created',
          request: {
            url: 'https://example.com/users?dry=true',
            method: 'POST',
            headers: [{ key: 'Content-Type', value: 'application/json' }],
            queryParams: [{ key: 'dry', value: 'true' }],
            body: { type: 'json', content: '{"name":"Ada"}' }
          },
          response: {
            statusCode: 201,
            statusText: 'Created',
            headers: [{ key: 'content-type', value: 'application/json; charset=utf-8' }],
            body: { type: 'text', content: '{"id":1}' }
          }
        }]
      })
    ]));

    const [example] = collection.items[0].examples;
    expect(example).toMatchObject({
      name: '201 Created',
      itemUid: collection.items[0].uid,
      request: {
        url: 'https://example.com/users?dry=true',
        method: 'POST',
        params: [{ name: 'dry', value: 'true', type: 'query' }],
        body: { mode: 'json', json: '{"name":"Ada"}' }
      },
      response: {
        status: 201,
        statusText: 'Created',
        body: { type: 'json', content: '{"id":1}' }
      }
    });
  });

  it('imports collection variables', async () => {
    const { collection } = await postmanToBruno(makeV3Collection([], {
      variables: [
        { key: 'baseUrl', value: 'https://example.com', disabled: false },
        { key: 'api key', secret: true },
        { key: 'off', value: 'x', disabled: true }
      ]
    }));

    expect(collection.root.request.vars.req).toMatchObject([
      { name: 'baseUrl', value: 'https://example.com', enabled: true },
      { name: 'api_key', value: '', enabled: true },
      { name: 'off', value: 'x', enabled: false }
    ]);
  });

  it('de-duplicates sibling names per item kind', async () => {
    const { collection } = await postmanToBruno(makeV3Collection([
      makeV3Request('Same'),
      makeV3Request('Same'),
      makeV3Folder('Same', [])
    ]));

    expect(collection.items.map((item) => item.name)).toEqual(['Same', 'Same_1', 'Same']);
  });

  it('skips unsupported and malformed items and imports the rest', async () => {
    const grpcItem = { $kind: 'grpc-request', name: 'Greeter', url: 'localhost:50051' };
    const graphqlItem = {
      $kind: 'graphql-request',
      name: 'Get User',
      url: 'https://example.com/graphql',
      query: 'query { me { id } }',
      examples: [{ $kind: 'graphql-example', name: 'Saved' }]
    };

    const { collection, issues } = await postmanToBruno(makeV3Collection([
      makeV3Request('Valid'),
      grpcItem,
      graphqlItem,
      null
    ]));

    expect(collection.items.map((item) => item.name)).toEqual(['Valid']);
    expect(issues).toEqual([
      { path: 'Greeter', severity: 'error', message: 'Unsupported item type "grpc-request", not imported', sourceItem: grpcItem },
      { path: 'Get User', severity: 'error', message: 'Unsupported item type "graphql-request", not imported', sourceItem: graphqlItem },
      { path: 'Item 4', severity: 'error', message: 'Malformed collection item (not an object)' }
    ]);
  });
});
