import { transformCollectionToSaveToExportAsFile, transformRequestToSaveToFilesystem } from 'utils/collections/index';
import { deleteUidsInItems, transformItem } from 'utils/collections/export';
import { transformItemsInCollection } from 'utils/importers/common';

describe('HTTP Request Export/Import', () => {
  const makeHttpCollection = (requests = []) => ({
    uid: 'test-collection',
    name: 'Test Collection',
    items: requests
  });

  const makeHttpRequest = (overrides = {}) => ({
    uid: 'http-request-1',
    type: 'http-request',
    name: 'Test HTTP Request',
    seq: 1,
    request: {
      method: 'GET',
      url: 'https://api.example.com/test',
      params: [],
      headers: [
        { uid: 'hdr-1', name: 'Content-Type', value: 'application/json', enabled: true }
      ],
      auth: { mode: 'none' },
      body: { mode: 'none' },
      script: undefined,
      vars: {
        req: [{ uid: 'var-1', name: 'baseUrl', value: 'https://api.example.com', enabled: true }],
        res: []
      },
      assertions: [],
      tests: ''
    },
    ...overrides
  });

  describe('transformCollectionToSaveToExportAsFile', () => {
    it('should preserve HTTP request fields during export', () => {
      const collection = makeHttpCollection([makeHttpRequest()]);
      const result = transformCollectionToSaveToExportAsFile(collection);

      const exported = result.items[0];
      expect(exported.name).toBe('Test HTTP Request');
      expect(exported.type).toBe('http-request');
      expect(exported.request.method).toBe('GET');
      expect(exported.request.url).toBe('https://api.example.com/test');
      expect(exported.request.headers).toHaveLength(1);
      expect(exported.request.headers[0].name).toBe('Content-Type');
    });

    it('should preserve POST request with JSON body', () => {
      const collection = makeHttpCollection([makeHttpRequest({
        request: {
          method: 'POST',
          url: 'https://api.example.com/users',
          params: [],
          headers: [],
          auth: { mode: 'none' },
          body: { mode: 'json', json: '{"name":"test"}' },
          vars: { req: [], res: [] },
          assertions: [],
          tests: ''
        }
      })]);
      const result = transformCollectionToSaveToExportAsFile(collection);
      const exported = result.items[0];
      expect(exported.request.method).toBe('POST');
      expect(exported.request.body.mode).toBe('json');
      expect(exported.request.body.json).toBe('{"name":"test"}');
    });

    it('should preserve query params during export', () => {
      const collection = makeHttpCollection([makeHttpRequest({
        request: {
          method: 'GET',
          url: 'https://api.example.com/search',
          params: [
            { uid: 'p-1', name: 'q', value: 'test', enabled: true, type: 'query' },
            { uid: 'p-2', name: 'page', value: '1', enabled: true, type: 'query' }
          ],
          headers: [],
          auth: { mode: 'none' },
          body: { mode: 'none' },
          vars: { req: [], res: [] },
          assertions: [],
          tests: ''
        }
      })]);
      const result = transformCollectionToSaveToExportAsFile(collection);
      const exported = result.items[0];
      expect(exported.request.params).toHaveLength(2);
      expect(exported.request.params[0].name).toBe('q');
      expect(exported.request.params[1].name).toBe('page');
    });

    it('should preserve auth settings during export', () => {
      const collection = makeHttpCollection([makeHttpRequest({
        request: {
          method: 'GET',
          url: 'https://api.example.com/test',
          params: [],
          headers: [],
          auth: {
            mode: 'bearer',
            bearer: { token: 'test-token' }
          },
          body: { mode: 'none' },
          vars: { req: [], res: [] },
          assertions: [],
          tests: ''
        }
      })]);
      const result = transformCollectionToSaveToExportAsFile(collection);
      const exported = result.items[0];
      expect(exported.request.auth.mode).toBe('bearer');
      expect(exported.request.auth.bearer.token).toBe('test-token');
    });

    it('should preserve script and tests during export', () => {
      const collection = makeHttpCollection([makeHttpRequest({
        request: {
          method: 'GET',
          url: 'https://api.example.com/test',
          params: [],
          headers: [],
          auth: { mode: 'none' },
          body: { mode: 'none' },
          script: { req: 'console.log("pre");', res: 'console.log("post");' },
          vars: { req: [], res: [] },
          assertions: [],
          tests: 'test("status is 200", () => {})'
        }
      })]);
      const result = transformCollectionToSaveToExportAsFile(collection);
      const exported = result.items[0];
      expect(exported.request.script.req).toBe('console.log("pre");');
      expect(exported.request.script.res).toBe('console.log("post");');
    });
  });

  describe('transformRequestToSaveToFilesystem', () => {
    it('should preserve core request fields when saving', () => {
      const request = makeHttpRequest();
      const result = transformRequestToSaveToFilesystem(request);

      expect(result).toHaveProperty('uid');
      expect(result.name).toBe('Test HTTP Request');
      expect(result.type).toBe('http-request');
      expect(result.request.method).toBe('GET');
      expect(result.request.url).toBe('https://api.example.com/test');
      expect(result.request.body).toBeDefined();
    });

    it('should handle request with draft', () => {
      const request = makeHttpRequest({
        draft: makeHttpRequest({
          uid: 'http-request-1',
          name: 'Draft Name',
          request: {
            method: 'POST',
            url: 'https://api.example.com/draft',
            params: [],
            headers: [],
            auth: { mode: 'none' },
            body: { mode: 'json', json: '{"draft":true}' },
            vars: { req: [], res: [] },
            assertions: [],
            tests: ''
          }
        })
      });
      const result = transformRequestToSaveToFilesystem(request);

      expect(result.name).toBe('Draft Name');
      expect(result.request.method).toBe('POST');
      expect(result.request.url).toBe('https://api.example.com/draft');
    });

    it('should handle form multipart body', () => {
      const request = makeHttpRequest({
        request: {
          method: 'POST',
          url: 'https://api.example.com/upload',
          params: [],
          headers: [],
          auth: { mode: 'none' },
          body: {
            mode: 'multipartForm',
            multipartForm: [
              { uid: 'mp-1', name: 'file', value: 'test.txt', type: 'file', enabled: true }
            ]
          },
          vars: { req: [], res: [] },
          assertions: [],
          tests: ''
        }
      });
      const result = transformRequestToSaveToFilesystem(request);
      expect(result.request.body.mode).toBe('multipartForm');
    });
  });

  describe('Full HTTP Export/Import Round Trip', () => {
    it('should preserve all request data through export→import cycle', () => {
      const originalCollection = makeHttpCollection([
        makeHttpRequest({
          seq: 1,
          request: {
            method: 'POST',
            url: 'https://api.example.com/users',
            params: [
              { uid: 'p-1', name: 'limit', value: '10', enabled: true, type: 'query' }
            ],
            headers: [
              { uid: 'hdr-1', name: 'Content-Type', value: 'application/json', enabled: true },
              { uid: 'hdr-2', name: 'Authorization', value: 'Bearer token123', enabled: true }
            ],
            auth: { mode: 'bearer', bearer: { token: 'token123' } },
            body: { mode: 'json', json: '{"name":"test user","email":"test@example.com"}' },
            script: { req: 'console.log("pre-request");', res: 'console.log("post-response");' },
            vars: {
              req: [{ uid: 'v-1', name: 'userId', value: '123', enabled: true }],
              res: []
            },
            assertions: [{ uid: 'a-1', name: 'Status is 200', enabled: true }],
            tests: 'test("Status is 200", () => {\n  bru.expect(res.getStatus()).to.equal(200);\n});'
          }
        })
      ]);

      const exported = transformCollectionToSaveToExportAsFile(originalCollection);
      const collectionCopy = JSON.parse(JSON.stringify(exported));
      deleteUidsInItems(collectionCopy.items);
      transformItem(collectionCopy.items);
      transformItemsInCollection(collectionCopy);

      const imported = collectionCopy.items[0];
      expect(imported.name).toBe('Test HTTP Request');
      expect(imported.type).toBe('http-request');
      expect(imported.request.method).toBe('POST');
      expect(imported.request.url).toBe('https://api.example.com/users');
      expect(imported.request.headers).toHaveLength(2);
      expect(imported.request.params).toHaveLength(1);
      expect(imported.request.body.mode).toBe('json');
      expect(imported.request.body.json).toBe('{"name":"test user","email":"test@example.com"}');
      expect(imported.request.auth.mode).toBe('bearer');
      expect(imported.request.script.req).toBe('console.log("pre-request");');
      expect(imported.request.script.res).toBe('console.log("post-response");');
      expect(imported.request.vars.req).toHaveLength(1);
      expect(imported.request.vars.req[0].name).toBe('userId');
      expect(imported.request.tests).toContain('test("Status is 200"');
    });

    it('should handle GraphQL request round trip', () => {
      const collection = makeHttpCollection([{
        uid: 'gql-1',
        type: 'graphql-request',
        name: 'Test GraphQL',
        seq: 1,
        request: {
          method: 'POST',
          url: 'https://api.example.com/graphql',
          params: [],
          headers: [
            { uid: 'hdr-1', name: 'Content-Type', value: 'application/json', enabled: true }
          ],
          auth: { mode: 'none' },
          body: {
            mode: 'graphql',
            graphql: {
              query: 'query getUser($id: ID!) { user(id: $id) { name email } }',
              variables: '{"id":"123"}'
            }
          },
          vars: { req: [], res: [] },
          assertions: [],
          tests: ''
        }
      }]);

      const exported = transformCollectionToSaveToExportAsFile(collection);
      const collectionCopy = JSON.parse(JSON.stringify(exported));
      deleteUidsInItems(collectionCopy.items);
      transformItem(collectionCopy.items);
      transformItemsInCollection(collectionCopy);

      const imported = collectionCopy.items[0];
      expect(imported.type).toBe('graphql-request');
      expect(imported.request.body.mode).toBe('graphql');
      expect(imported.request.body.graphql.query).toContain('query getUser');
      expect(imported.request.body.graphql.variables).toBe('{"id":"123"}');
    });

    it('should handle WebSocket request round trip', () => {
      const collection = makeHttpCollection([{
        uid: 'ws-1',
        type: 'ws-request',
        name: 'Test WebSocket',
        seq: 1,
        request: {
          url: 'wss://echo.example.com/socket',
          method: undefined,
          params: [],
          headers: [],
          auth: { mode: 'none' },
          body: { mode: 'none' },
          vars: { req: [], res: [] },
          assertions: [],
          tests: ''
        }
      }]);

      const exported = transformCollectionToSaveToExportAsFile(collection);
      const collectionCopy = JSON.parse(JSON.stringify(exported));
      deleteUidsInItems(collectionCopy.items);

      const exportedItem = collectionCopy.items[0];
      expect(exportedItem.type).toBe('ws-request');
      expect(exportedItem.request.url).toBe('wss://echo.example.com/socket');
    });

    it('should process multiple HTTP methods correctly', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      const collection = makeHttpCollection(methods.map((method, i) => ({
        uid: `req-${i}`,
        type: 'http-request',
        name: `${method} Request`,
        seq: i + 1,
        request: {
          method,
          url: `https://api.example.com/${method.toLowerCase()}`,
          params: [],
          headers: [],
          auth: { mode: 'none' },
          body: { mode: 'none' },
          vars: { req: [], res: [] },
          assertions: [],
          tests: ''
        }
      })));

      const exported = transformCollectionToSaveToExportAsFile(collection);
      expect(exported.items).toHaveLength(7);

      const collectionCopy = JSON.parse(JSON.stringify(exported));
      deleteUidsInItems(collectionCopy.items);
      transformItem(collectionCopy.items);
      transformItemsInCollection(collectionCopy);

      collectionCopy.items.forEach((item, i) => {
        expect(item.type).toBe('http-request');
        expect(item.request.method).toBe(methods[i]);
        expect(item.name).toBe(`${methods[i]} Request`);
      });
    });
  });

  describe('deleteUidsInItems', () => {
    it('should remove all UIDs from request items', () => {
      const items = [makeHttpRequest()];
      deleteUidsInItems(items);

      const item = items[0];
      expect(item.uid).toBeUndefined();
      expect(item.request.headers[0].uid).toBeUndefined();
      expect(item.request.vars.req[0].uid).toBeUndefined();
    });

    it('should handle nested folder items recursively', () => {
      const items = [
        {
          uid: 'folder-1',
          type: 'folder',
          name: 'Test Folder',
          items: [
            makeHttpRequest()
          ]
        }
      ];
      deleteUidsInItems(items);

      expect(items[0].uid).toBeUndefined();
      expect(items[0].items[0].uid).toBeUndefined();
    });
  });

  describe('transformItem', () => {
    it('should transform http-request type to http', () => {
      const items = [makeHttpRequest()];
      transformItem(items);
      expect(items[0].type).toBe('http');
    });

    it('should transform graphql-request type to graphql', () => {
      const items = [{
        uid: 'gql-1',
        type: 'graphql-request',
        name: 'Test',
        request: { method: 'POST', url: 'http://test.com', params: [], headers: [], auth: {}, body: {} }
      }];
      transformItem(items);
      expect(items[0].type).toBe('graphql');
    });
  });
});
